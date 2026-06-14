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

import {
  createComponentsV2TextMessage,
  EVENT_COLORS,
  discordTimestamp
} from "./components-v2.js";

export const logChannelTopicMarker = "[discord-management-bot:logs]";

function getEventAccentColor(eventName: string): number {
  if (eventName.startsWith("voice.session.") || eventName.startsWith("call.")) return EVENT_COLORS.purple;
  if (eventName.startsWith("voice.temp.")) return EVENT_COLORS.teal;
  if (eventName.startsWith("message.")) return EVENT_COLORS.blue;
  if (eventName.startsWith("member.") || eventName.startsWith("guild.")) return EVENT_COLORS.yellow;
  if (eventName.startsWith("recruitment.")) return EVENT_COLORS.green;
  if (eventName.startsWith("tts.")) return EVENT_COLORS.blue;
  if (eventName.startsWith("system.") && (eventName.includes("error") || eventName.includes("crashed") || eventName.includes("failed"))) return EVENT_COLORS.red;
  if (eventName.startsWith("system.")) return EVENT_COLORS.yellow;
  return EVENT_COLORS.gray;
}

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

  const config = await getGuildConfigByGuildId(db, event.guildId).catch((error: unknown) => {
    console.warn("failed to fetch guild config for log channel locale", error);
    return null;
  });
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language)
      ? config.language
      : "en";
  const loc = getLocale(lang);

  const rawAttachments = event.payload.attachments;
  const mediaUrls: string[] = Array.isArray(rawAttachments)
    ? rawAttachments
        .filter((a): a is { url: string } =>
          typeof a === "object" && a !== null &&
          typeof (a as Record<string, unknown>).url === "string")
        .map(a => a.url)
    : [];

  await channel.send({
    ...createComponentsV2TextMessage({
      title: formatLogEventTitle(event.eventName, loc),
      lines: formatLogEventLines(event, loc),
      accentColor: getEventAccentColor(event.eventName),
      ...(mediaUrls.length > 0 ? { mediaUrls } : {})
    }),
    allowedMentions: { parse: [] }
  });
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
  return loc.logEventTitle({ eventName });
}

export function formatLogEventLines(event: NormalizedEvent, loc: Locale) {
  return [
    event.actorId ? loc.logActor({ actorId: event.actorId }) : loc.logActorUnknown,
    formatChannelLine(event, loc),
    event.messageId ? loc.logMessageId({ messageId: event.messageId }) : null,
    `${loc.logEventTimeLabel}: ${discordTimestamp(event.eventTimestamp)}`,
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

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function formatPayloadValue(v: unknown): string {
  if (v === null || v === undefined) return "–";
  if (typeof v === "string") return v || "–";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "–";
}

function formatLogPayload(payload: NormalizedEvent["payload"], loc: Locale): string | null {
  const lines: string[] = [];

  // message.update — show before/after comparison
  if ("oldContent" in payload) {
    const before = typeof payload.oldContent === "string" ? payload.oldContent : null;
    const after  = typeof payload.newContent === "string" ? payload.newContent  : null;
    if (before !== null || after !== null) {
      lines.push(loc.logContentChange({
        before: truncateForDiscord(before ?? "–", 400),
        after:  truncateForDiscord(after  ?? "–", 400)
      }));
    }
    return lines.length > 0 ? lines.join("\n") : null;
  }

  // message.create / message.delete — show content if present (empty string → "(empty)")
  const content = typeof payload.content === "string" ? payload.content : null;
  if (content !== null) {
    lines.push(loc.logContent({ content: truncateForDiscord(content || "(empty)", 800) }));
    return lines.length > 0 ? lines.join("\n") : null;
  }

  // Other events — recruitment fields, role/channel changes, etc.
  if (typeof payload.creatorId === "string") {
    lines.push(loc.logRecruitmentCreator({ id: payload.creatorId }));
  }

  if (typeof payload.genre === "string") {
    lines.push(loc.logRecruitmentGenre({ genre: payload.genre }));
  }

  if (typeof payload.reason === "string" && payload.reason.length > 0) {
    lines.push(loc.logReason({ reason: payload.reason }));
  }

  const changes = payload.changes;
  if (isObj(changes)) {
    for (const [field, change] of Object.entries(changes)) {
      if (!isObj(change)) continue;
      const label = loc.logFieldLabel(field);
      if (!label) continue;
      lines.push(loc.logChangeField({
        label,
        before: formatPayloadValue(change.before),
        after: formatPayloadValue(change.after),
      }));
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

function truncateForDiscord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
