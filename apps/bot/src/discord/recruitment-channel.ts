import {
  ButtonStyle,
  ChannelType,
  ComponentType,
  type Guild,
  type MessageCreateOptions,
  type MessageEditOptions,
  MessageFlags,
  type TextChannel
} from "discord.js";
import type { createRecruitment } from "@discord-bot/db";

export const recruitmentChannelTopicMarker =
  "[discord-management-bot:recruitment]";

type Recruitment = Awaited<ReturnType<typeof createRecruitment>>;

export type RecruitmentAction = "close" | "join" | "leave";

export const recruitmentCustomIdPrefix = "recruitment";

export function createRecruitmentCustomId(
  action: RecruitmentAction,
  recruitmentId: string
) {
  return `${recruitmentCustomIdPrefix}:${action}:${recruitmentId}`;
}

export function parseRecruitmentCustomId(customId: string) {
  const [prefix, action, recruitmentId] = customId.split(":");

  if (
    prefix !== recruitmentCustomIdPrefix ||
    !isRecruitmentAction(action) ||
    !recruitmentId
  ) {
    return null;
  }

  return { action, recruitmentId };
}

export function hasRecruitmentChannelMarker(
  topic: string | null | undefined
) {
  return topic?.includes(recruitmentChannelTopicMarker) === true;
}

export function appendRecruitmentChannelMarker(
  topic: string | null | undefined
) {
  const normalizedTopic = topic?.trim();

  if (hasRecruitmentChannelMarker(normalizedTopic)) {
    return normalizedTopic ?? recruitmentChannelTopicMarker;
  }

  return [normalizedTopic, recruitmentChannelTopicMarker]
    .filter(Boolean)
    .join("\n");
}

export async function markRecruitmentChannel(channel: TextChannel) {
  if (hasRecruitmentChannelMarker(channel.topic)) {
    return;
  }

  await channel.setTopic(
    appendRecruitmentChannelMarker(channel.topic),
    "Configured as the bot recruitment channel."
  );
}

export async function findMarkedRecruitmentChannel(guild: Guild) {
  const channels = await guild.channels.fetch();

  return (
    channels.find(
      (channel): channel is TextChannel =>
        channel?.type === ChannelType.GuildText &&
        hasRecruitmentChannelMarker(channel.topic)
    ) ?? null
  );
}

export function createRecruitmentPostMessage(
  recruitment: Recruitment,
  activeParticipantCount = 0
): MessageCreateOptions & MessageEditOptions {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `## Recruitment: ${recruitment.genre}`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Status: ${recruitment.status}`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Capacity: ${activeParticipantCount}/${recruitment.capacity}`
          },
          {
            type: ComponentType.TextDisplay,
            content: `Creator: <@${recruitment.creatorId}>`
          },
          {
            type: ComponentType.TextDisplay,
            content: recruitment.voiceChannelId
              ? `VC: <#${recruitment.voiceChannelId}>`
              : "VC: none"
          },
          {
            type: ComponentType.TextDisplay,
            content: `Auto close: ${recruitment.autoClose ? "on" : "off"}`
          },
          {
            type: ComponentType.TextDisplay,
            content: recruitment.content
          }
        ]
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            customId: createRecruitmentCustomId("join", recruitment.id),
            label: "Join",
            style: ButtonStyle.Primary,
            disabled: recruitment.status === "closed"
          },
          {
            type: ComponentType.Button,
            customId: createRecruitmentCustomId("leave", recruitment.id),
            label: "Leave",
            style: ButtonStyle.Secondary
          },
          {
            type: ComponentType.Button,
            customId: createRecruitmentCustomId("close", recruitment.id),
            label: "Close",
            style: ButtonStyle.Danger,
            disabled: recruitment.status === "closed"
          }
        ]
      }
    ]
  };
}

function isRecruitmentAction(value: string | undefined): value is RecruitmentAction {
  return value === "close" || value === "join" || value === "leave";
}
