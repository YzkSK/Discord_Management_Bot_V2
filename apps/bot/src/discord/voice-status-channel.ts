import {
  ChannelType,
  ComponentType,
  MessageFlags,
  type Guild,
  type MessageCreateOptions,
  type MessageEditOptions,
  type TextChannel
} from "discord.js";

import type { getLocale } from "@discord-bot/shared";

import { discordRelative, EVENT_COLORS } from "./components-v2.js";

export const voiceStatusChannelTopicMarker =
  "[discord-management-bot:voice-status]";

export type VoiceStatusDisplayState = "started" | "active" | "ended";

type Loc = ReturnType<typeof getLocale>;

export function hasVoiceStatusChannelMarker(
  topic: string | null | undefined
) {
  return topic?.includes(voiceStatusChannelTopicMarker) === true;
}

export function appendVoiceStatusChannelMarker(
  topic: string | null | undefined
) {
  const normalizedTopic = topic?.trim();

  if (hasVoiceStatusChannelMarker(normalizedTopic)) {
    return normalizedTopic ?? voiceStatusChannelTopicMarker;
  }

  return [normalizedTopic, voiceStatusChannelTopicMarker]
    .filter(Boolean)
    .join("\n");
}

export async function markVoiceStatusChannel(channel: TextChannel) {
  if (hasVoiceStatusChannelMarker(channel.topic)) {
    return;
  }

  await channel.setTopic(
    appendVoiceStatusChannelMarker(channel.topic),
    "Configured as the bot voice status channel."
  );
}

export async function findMarkedVoiceStatusChannel(guild: Guild) {
  const channels = await guild.channels.fetch();

  return (
    channels.find(
      (channel): channel is TextChannel =>
        channel?.type === ChannelType.GuildText &&
        hasVoiceStatusChannelMarker(channel.topic)
    ) ?? null
  );
}

export function resolveVoiceStatusDisplayState(input: {
  endedAt?: Date | null;
  now: Date;
  startedAt: Date;
}): VoiceStatusDisplayState {
  if (input.endedAt) {
    return "ended";
  }

  return input.now.getTime() - input.startedAt.getTime() >= 60_000
    ? "active"
    : "started";
}

export function createVoiceStatusMessage(input: {
  channelId: string;
  endedAt?: Date | null;
  loc: Loc;
  memberIds?: string[];
  memberCount: number;
  now: Date;
  sessionId: string;
  startedAt: Date;
}): MessageCreateOptions & MessageEditOptions {
  const state = resolveVoiceStatusDisplayState({
    endedAt: input.endedAt ?? null,
    now: input.now,
    startedAt: input.startedAt
  });

  const accentColor = stateAccentColor(state);
  const title = stateTitle(state, input.loc);
  const durationMs = (input.endedAt ?? input.now).getTime() - input.startedAt.getTime();
  const duration = formatDuration(durationMs);
  const relativeStarted = discordRelative(input.startedAt);

  const containerComponents: unknown[] = [
    { type: ComponentType.TextDisplay, content: `## ${title}` },
    { type: ComponentType.TextDisplay, content: `<#${input.channelId}>` }
  ];

  const memberIds = input.memberIds ?? [];

  if (memberIds.length > 0) {
    containerComponents.push({ type: ComponentType.Separator });
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: `👥 ${memberIds.map(id => `<@${id}>`).join("  ")}`
    });
  } else if (input.memberCount > 0) {
    containerComponents.push({ type: ComponentType.Separator });
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: `👥 ${input.memberCount}`
    });
  }

  containerComponents.push({ type: ComponentType.Separator });

  if (input.endedAt) {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: input.loc.voiceSessionEndedAt({ timestamp: discordRelative(input.endedAt), duration })
    });
  } else {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: input.loc.voiceSessionStartedAt({ timestamp: relativeStarted, duration })
    });
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        accent_color: accentColor,
        components: containerComponents as never[]
      }
    ]
  };
}

function stateAccentColor(state: VoiceStatusDisplayState): number {
  switch (state) {
    case "started":
      return EVENT_COLORS.green;
    case "active":
      return EVENT_COLORS.blue;
    case "ended":
      return EVENT_COLORS.gray;
  }
}

function stateTitle(state: VoiceStatusDisplayState, loc: Loc): string {
  switch (state) {
    case "started":
      return loc.voiceSessionTitleStarted;
    case "active":
      return loc.voiceSessionTitleActive;
    case "ended":
      return loc.voiceSessionTitleEnded;
  }
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
