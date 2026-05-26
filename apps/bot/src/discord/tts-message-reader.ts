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

  const config = await getGuildConfigByGuildId(options.db, message.guildId);
  const readableChannelIds = options.ttsSessionManager.getReadableChannelIds(
    message.guildId,
    config?.ttsTextChannelId ?? null
  );

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
