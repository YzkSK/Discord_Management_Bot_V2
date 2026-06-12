import {
  getGuildConfigByGuildId,
  getEffectiveTtsSpeakerId,
  listEffectiveTtsDictionaryEntries,
  type DbClient,
  type EffectiveTtsDictionaryEntry
} from "@discord-bot/db";
import { Events, type Client, type Message } from "discord.js";

import type { DiscordLogWriter } from "./log-writer.js";
import {
  createTtsMessageSkippedEvent,
  createTtsMessageSpokenEvent
} from "./tts-logs.js";
import { LocalTtsPlaybackQueue, type TtsPlaybackQueue } from "./tts-queue.js";
import type { TtsSessionManager } from "./tts-session.js";
import { normalizeTtsText, type VoicevoxClient } from "./voicevox.js";

export interface InstallTtsMessageReaderOptions {
  db: DbClient;
  loadDictionaryEntries?: (
    input: LoadTtsDictionaryEntriesInput
  ) => Promise<EffectiveTtsDictionaryEntry[]>;
  loadSpeakerId?: (input: LoadTtsSpeakerIdInput) => Promise<number>;
  logWriter: DiscordLogWriter;
  normalizeWithLlm?: (text: string, guildId: string) => Promise<string>;
  rateLimiter?: TtsRateLimiter;
  speakerId: number;
  ttsQueue?: TtsPlaybackQueue;
  ttsSessionManager: TtsSessionManager;
  voicevox: VoicevoxClient;
}

export interface ShouldReadTtsMessageInput {
  authorIsBot: boolean;
  channelId: string;
  content: string;
  readableChannelIds: string[];
}

export interface ResolveReadableTtsChannelIdsInput {
  channelId: string;
  guildId: string;
  loadPersistentTextChannelId: (guildId: string) => Promise<string | null>;
  temporaryChannelIds: string[];
}

export interface ResolveTtsMessageSourceTypeInput {
  channelId: string;
  temporaryChannelIds: string[];
}

export interface LoadTtsDictionaryEntriesInput {
  guildId: string;
  userId: string;
}

export interface LoadTtsSpeakerIdInput {
  fallbackSpeakerId: number;
  guildId: string;
  userId: string;
}

export interface TtsRateLimitInput {
  guildId: string;
  userId: string;
  now?: number;
}

export interface TtsRateLimiter {
  allow: (input: TtsRateLimitInput) => boolean;
}

export interface TtsMessageRateLimiterOptions {
  maxMessages?: number;
  windowMs?: number;
}

export type TtsMessageSkipReason =
  | "command-like"
  | "empty"
  | "rate-limited"
  | "too-long"
  | "user-muted";

export function installTtsMessageReader(
  client: Client,
  options: InstallTtsMessageReaderOptions
) {
  const readerOptions: InstallTtsMessageReaderOptions = {
    ...options,
    rateLimiter: options.rateLimiter ?? new TtsMessageRateLimiter(),
    ttsQueue: options.ttsQueue ?? new LocalTtsPlaybackQueue()
  };

  client.on(Events.MessageCreate, (message) => {
    void handleTtsMessage(message, readerOptions).catch((error: unknown) => {
      console.error("tts message reader failed", {
        channelId: message.channelId,
        guildId: message.guildId,
        messageId: message.id,
        error
      });
    });
  });
}

export function shouldReadTtsMessage(input: ShouldReadTtsMessageInput) {
  if (!input.readableChannelIds.includes(input.channelId)) {
    return false;
  }

  return (
    normalizeTtsText({
      authorIsBot: input.authorIsBot,
      content: input.content
    }) !== null
  );
}

export async function resolveReadableTtsChannelIds(
  input: ResolveReadableTtsChannelIdsInput
) {
  if (input.temporaryChannelIds.includes(input.channelId)) {
    return input.temporaryChannelIds;
  }

  const persistentTextChannelId = await input.loadPersistentTextChannelId(
    input.guildId
  );

  return Array.from(
    new Set([
      ...input.temporaryChannelIds,
      ...(persistentTextChannelId ? [persistentTextChannelId] : [])
    ])
  );
}

export function resolveTtsMessageSourceType(
  input: ResolveTtsMessageSourceTypeInput
) {
  return input.temporaryChannelIds.includes(input.channelId)
    ? "temporary"
    : "configured";
}

export function resolveTtsMessageSkipReason(input: {
  authorIsBot: boolean;
  content: string;
}): TtsMessageSkipReason | null {
  if (input.authorIsBot) {
    return null;
  }

  const text = input.content.trim();

  if (!text) {
    return "empty";
  }

  if (text.startsWith("//")) {
    return "user-muted";
  }

  if (text.startsWith("/")) {
    return "command-like";
  }

  if (text.length > 120) {
    return "too-long";
  }

  return null;
}

export class TtsMessageRateLimiter implements TtsRateLimiter {
  private readonly maxMessages: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(options: TtsMessageRateLimiterOptions = {}) {
    this.maxMessages = options.maxMessages ?? 5;
    this.windowMs = options.windowMs ?? 10_000;
  }

  allow(input: TtsRateLimitInput) {
    const now = input.now ?? Date.now();
    const key = `${input.guildId}:${input.userId}`;
    const threshold = now - this.windowMs;
    const bucket = (this.buckets.get(key) ?? []).filter(
      (timestamp) => timestamp > threshold
    );

    if (bucket.length >= this.maxMessages) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.push(now);
    this.buckets.set(key, bucket);
    return true;
  }
}

export interface ApplyTtsDictionaryEntriesOptions {
  maxReplacements?: number;
}

export function applyTtsDictionaryEntries(
  text: string,
  entries: EffectiveTtsDictionaryEntry[],
  options: ApplyTtsDictionaryEntriesOptions = {}
) {
  const maxReplacements = options.maxReplacements ?? 50;
  let replacementCount = 0;

  return entries.reduce((current, entry) => {
    if (!entry.isEnabled || !entry.fromText) {
      return current;
    }

    let next = current;
    while (
      replacementCount < maxReplacements &&
      next.includes(entry.fromText)
    ) {
      next = next.replace(entry.fromText, entry.toText);
      replacementCount += 1;
    }

    return next;
  }, text);
}

export function sanitizeTtsText(text: string) {
  return text
    // コードブロック (Markdown 処理より先に除去)
    .replace(/```[\s\S]*?```/g, " ")
    // インラインコード
    .replace(/`[^`\n]+`/g, " ")
    // Discord カスタム/アニメ絵文字 <:name:id> / <a:name:id>
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, " ")
    // Unicode 絵文字
    .replace(/\p{Extended_Pictographic}/gu, " ")
    // Markdown (記号を除去・本文は残す)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/~~([^~\n]+)~~/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    // 引用行の > を除去
    .replace(/^>\s?/gm, "")
    // 顔文字ヒューリスティック: 括弧内に日本語・英数字を含まない記号列
    // ぁ-ゞ=ひらがな, ァ-ヺ=カタカナ(・U+30FBは除外範囲外=顔文字に使用可)
    .replace(/[（(][^ぁ-ゞァ-ヺ一-鿿（）()\w\n]{2,20}[）)]/g, " ")
    // URL 除去
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    // Discord メンション除去
    .replace(/<@!?\d+>|<@&\d+>|<#\d+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function handleTtsMessage(
  message: Message,
  options: InstallTtsMessageReaderOptions
) {
  if (!message.inGuild()) {
    return;
  }

  if (!options.ttsSessionManager.isConnected(message.guildId)) {
    return;
  }

  const temporaryChannelIds = options.ttsSessionManager.getReadableChannelIds(
    message.guildId
  );
  const voiceChannelId = options.ttsSessionManager.getVoiceChannelId(
    message.guildId
  );
  const readableChannelIds = await resolveReadableTtsChannelIds({
    channelId: message.channelId,
    guildId: message.guildId,
    loadPersistentTextChannelId: async (guildId) => {
      const config = await getGuildConfigByGuildId(options.db, guildId);
      return config?.ttsTextChannelId ?? null;
    },
    temporaryChannelIds
  });

  if (!readableChannelIds.includes(message.channelId)) {
    return;
  }

  const skipReason = resolveTtsMessageSkipReason({
    authorIsBot: message.author.bot,
    content: message.content
  });

  if (skipReason) {
    await options.logWriter.write(
      createTtsMessageSkippedEvent({
        actorId: message.author.id,
        guildId: message.guildId,
        reason: skipReason,
        sourceChannelId: message.channelId,
        sourceMessageId: message.id,
        textLength: message.content.trim().length,
        voiceChannelId
      })
    );
    return;
  }

  if (
    options.rateLimiter &&
    !options.rateLimiter.allow({
      guildId: message.guildId,
      userId: message.author.id
    })
  ) {
    await options.logWriter.write(
      createTtsMessageSkippedEvent({
        actorId: message.author.id,
        guildId: message.guildId,
        reason: "rate-limited",
        sourceChannelId: message.channelId,
        sourceMessageId: message.id,
        textLength: message.content.trim().length,
        voiceChannelId
      })
    );
    return;
  }

  const normalizedText = normalizeTtsText({
    authorIsBot: message.author.bot,
    content: message.content
  });

  if (!normalizedText) {
    return;
  }

  const sanitizedText = sanitizeTtsText(normalizedText);
  if (!sanitizedText) {
    await options.logWriter.write(
      createTtsMessageSkippedEvent({
        actorId: message.author.id,
        guildId: message.guildId,
        reason: "empty",
        sourceChannelId: message.channelId,
        sourceMessageId: message.id,
        textLength: normalizedText.length,
        voiceChannelId
      })
    );
    return;
  }

  const llmText = options.normalizeWithLlm
    ? await options.normalizeWithLlm(sanitizedText, message.guildId)
    : sanitizedText;

  const readableText = llmText || sanitizedText;

  const loadDictionaryEntries =
    options.loadDictionaryEntries ??
    ((input: LoadTtsDictionaryEntriesInput) =>
      listEffectiveTtsDictionaryEntries(options.db, input));
  const loadSpeakerId =
    options.loadSpeakerId ??
    ((input: LoadTtsSpeakerIdInput) =>
      getEffectiveTtsSpeakerId(options.db, input));
  const speakerId = await loadSpeakerId({
    fallbackSpeakerId: options.speakerId,
    guildId: message.guildId,
    userId: message.author.id
  });
  const text = applyTtsDictionaryEntries(
    readableText,
    await loadDictionaryEntries({
      guildId: message.guildId,
      userId: message.author.id
    })
  );

  const ttsQueue = options.ttsQueue ?? new LocalTtsPlaybackQueue();

  await ttsQueue.enqueue({ guildId: message.guildId }, async () => {
    try {
      const audio = await options.voicevox.synthesize(text, speakerId);
      await options.ttsSessionManager.play(message.guildId, audio);
      await options.logWriter.write(
        createTtsMessageSpokenEvent({
          actorId: message.author.id,
          guildId: message.guildId,
          sourceChannelId: message.channelId,
          sourceMessageId: message.id,
          sourceType: resolveTtsMessageSourceType({
            channelId: message.channelId,
            temporaryChannelIds
          }),
          speakerId,
          textLength: text.length,
          voiceChannelId
        })
      );
    } catch (error) {
      await options.logWriter.write({
        actorId: message.author.id,
        channelId: message.channelId,
        eventName: "system.voicevox.error",
        eventTimestamp: new Date(),
        guildId: message.guildId,
        messageId: message.id,
        payload: {
          error: error instanceof Error ? error.message : String(error),
          sourceChannelId: message.channelId,
          sourceMessageId: message.id,
          speakerId,
          textLength: text.length,
          voiceChannelId
        },
        receivedAt: new Date()
      });
    }
  });
}
