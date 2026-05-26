import { getGuildConfigByGuildId, type DbClient } from "@discord-bot/db";
import { Events, type Client, type Message } from "discord.js";

import type { DiscordLogWriter } from "./log-writer.js";
import type { TtsSessionManager } from "./tts-session.js";
import { normalizeTtsText, type VoicevoxClient } from "./voicevox.js";

export interface InstallTtsMessageReaderOptions {
  db: DbClient;
  logWriter: DiscordLogWriter;
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

export function installTtsMessageReader(
  client: Client,
  options: InstallTtsMessageReaderOptions
) {
  client.on(Events.MessageCreate, (message) => {
    void handleTtsMessage(message, options).catch((error: unknown) => {
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

async function handleTtsMessage(
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
  const readableChannelIds = await resolveReadableTtsChannelIds({
    channelId: message.channelId,
    guildId: message.guildId,
    loadPersistentTextChannelId: async (guildId) => {
      const config = await getGuildConfigByGuildId(options.db, guildId);
      return config?.ttsTextChannelId ?? null;
    },
    temporaryChannelIds
  });

  if (
    !shouldReadTtsMessage({
      authorIsBot: message.author.bot,
      channelId: message.channelId,
      content: message.content,
      readableChannelIds
    })
  ) {
    return;
  }

  const text = normalizeTtsText({
    authorIsBot: message.author.bot,
    content: message.content
  });

  if (!text) {
    return;
  }

  try {
    const audio = await options.voicevox.synthesize(text);
    await options.ttsSessionManager.play(message.guildId, audio);
  } catch (error) {
    await options.logWriter.write({
      actorId: message.author.id,
      channelId: message.channelId,
      eventName: "system.voicevox.error",
      eventTimestamp: new Date(),
      guildId: message.guildId,
      messageId: message.id,
      payload: {
        error: error instanceof Error ? error.message : String(error)
      },
      receivedAt: new Date()
    });
  }
}
