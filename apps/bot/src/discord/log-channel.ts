import {
  ChannelType,
  type Client,
  type Guild,
  type TextChannel
} from "discord.js";
import type { NormalizedEvent } from "@discord-bot/shared";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";
import type { DbClient } from "@discord-bot/db";
import { getGuildConfigByGuildId } from "@discord-bot/db";

import { createComponentsV2TextMessage } from "./components-v2.js";

export const logChannelTopicMarker = "[discord-management-bot:logs]";

type Locale = ReturnType<typeof getLocale>;

export function hasLogChannelMarker(topic: string | null | undefined) {
  return topic?.includes(logChannelTopicMarker) === true;
}

export function appendLogChannelMarker(topic: string | null | undefined) {
  const normalizedTopic = topic?.trim();

  if (hasLogChannelMarker(normalizedTopic)) {
    return normalizedTopic ?? logChannelTopicMarker;
  }

  return [normalizedTopic, logChannelTopicMarker].filter(Boolean).join("\n");
}

export async function markLogChannel(channel: TextChannel) {
  if (hasLogChannelMarker(channel.topic)) {
    return;
  }

  await channel.setTopic(
    appendLogChannelMarker(channel.topic),
    "Configured as the bot log channel."
  );
}

export async function sendEventToConfiguredLogChannel(
  client: Client,
  event: NormalizedEvent,
  db: DbClient
) {
  if (!event.guildId) {
    return;
  }

  const guild = client.guilds.cache.get(event.guildId);

  if (!guild) {
    return;
  }

  const channel = await findMarkedLogChannel(guild);

  if (!channel) {
    return;
  }

  const config = await getGuildConfigByGuildId(db, event.guildId).catch(() => null);
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language)
      ? config.language
      : "en";
  const loc = getLocale(lang);

  await channel.send(
    createComponentsV2TextMessage({
      title: formatLogEventTitle(event.eventName, loc),
      lines: formatLogEventLines(event, loc)
    })
  );
}

export async function findMarkedLogChannel(guild: Guild) {
  const channels = await guild.channels.fetch();

  return (
    channels.find(
      (channel): channel is TextChannel =>
        channel?.type === ChannelType.GuildText &&
        hasLogChannelMarker(channel.topic)
    ) ?? null
  );
}

export function formatLogEventTitle(eventName: string, loc: Locale) {
  return loc.logTitle({ eventName });
}

export function formatLogEventLines(event: NormalizedEvent, loc: Locale) {
  return [
    event.actorId ? loc.logActor({ actorId: event.actorId }) : loc.logActorUnknown,
    formatChannelLine(event, loc),
    event.messageId ? loc.logMessageId({ messageId: event.messageId }) : null,
    loc.logEventTime({ timestamp: event.eventTimestamp.toISOString() }),
    formatLogPayload(event.payload, loc)
  ].filter((line): line is string => line !== null);
}

function formatChannelLine(event: NormalizedEvent, loc: Locale) {
  const tempVoiceChannelName =
    typeof event.payload.tempVoiceChannelName === "string"
      ? event.payload.tempVoiceChannelName
      : null;

  if (event.eventName.startsWith("voice.temp.") && tempVoiceChannelName) {
    return loc.logChannelNamed({ name: tempVoiceChannelName });
  }

  return event.channelId
    ? loc.logChannel({ channelId: event.channelId })
    : loc.logChannelUnknown;
}

function formatLogPayload(payload: NormalizedEvent["payload"], loc: Locale) {
  const content = typeof payload.content === "string" ? payload.content : null;

  if (content) {
    return loc.logContent({ content: truncateForDiscord(content, 800) });
  }

  const payloadSummary = JSON.stringify(payload);

  if (!payloadSummary || payloadSummary === "{}") {
    return loc.logDetailsNone;
  }

  return loc.logDetails({ details: truncateForDiscord(payloadSummary, 800) });
}

function truncateForDiscord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
