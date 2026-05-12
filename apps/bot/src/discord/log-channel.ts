import {
  ChannelType,
  type Client,
  type Guild,
  type TextChannel
} from "discord.js";
import type { NormalizedEvent } from "@discord-bot/shared";

import { createComponentsV2TextMessage } from "./components-v2.js";

export const logChannelTopicMarker = "[discord-management-bot:logs]";

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
  event: NormalizedEvent
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

  await channel.send(
    createComponentsV2TextMessage({
      title: formatLogEventTitle(event.eventName),
      lines: formatLogEventLines(event)
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

export function formatLogEventTitle(eventName: string) {
  return `Log: ${eventName}`;
}

export function formatLogEventLines(event: NormalizedEvent) {
  return [
    event.actorId ? `Actor: <@${event.actorId}>` : "Actor: unknown",
    event.channelId ? `Channel: <#${event.channelId}>` : "Channel: unknown",
    event.messageId ? `Message ID: ${event.messageId}` : "Message ID: unknown",
    `Event time: ${event.eventTimestamp.toISOString()}`,
    formatLogPayload(event.payload)
  ];
}

function formatLogPayload(payload: NormalizedEvent["payload"]) {
  const content = typeof payload.content === "string" ? payload.content : null;

  if (!content) {
    return "Content: none";
  }

  return `Content: ${truncateForDiscord(content, 800)}`;
}

function truncateForDiscord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
