import {
  ChannelType,
  ComponentType,
  MessageFlags,
  type Guild,
  type MessageCreateOptions,
  type MessageEditOptions,
  type TextChannel
} from "discord.js";

export const voiceStatusChannelTopicMarker =
  "[discord-management-bot:voice-status]";

export type VoiceStatusDisplayState = "started" | "active" | "ended";

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

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `## Voice Session: ${formatVoiceStatusState(state)}`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Voice channel: <#${input.channelId}>`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Members: ${input.memberCount}`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Duration: ${formatDuration(
              (input.endedAt ?? input.now).getTime() - input.startedAt.getTime()
            )}`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Started: ${input.startedAt.toISOString()}`
          },
          {
            type: ComponentType.TextDisplay,
            content: input.endedAt
              ? `Ended: ${input.endedAt.toISOString()}`
              : `Session ID: ${input.sessionId}`
          }
        ]
      }
    ]
  };
}

function formatVoiceStatusState(state: VoiceStatusDisplayState) {
  switch (state) {
    case "active":
      return "Active";
    case "ended":
      return "Ended";
    case "started":
      return "Started";
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
