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
import { EVENT_COLORS } from "./components-v2.js";
import type { createRecruitment } from "@discord-bot/db";
import type { getLocale } from "@discord-bot/shared";

export const recruitmentChannelTopicMarker =
  "[discord-management-bot:recruitment]";

type Recruitment = Awaited<ReturnType<typeof createRecruitment>>;
type Loc = ReturnType<typeof getLocale>;

export type RecruitmentAction = "close" | "join" | "leave" | "reopen";

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

function localizeStatus(status: string, loc: Loc): string {
  if (status === "open") return loc.recruitmentStatusOpen;
  if (status === "full") return loc.recruitmentStatusFull;
  return loc.recruitmentStatusClosed;
}

export function createRecruitmentPostMessage(
  recruitment: Recruitment,
  loc: Loc,
  activeParticipantCount = 0,
  participantIds: string[] = [],
  queuedIds: string[] = []
): MessageCreateOptions & MessageEditOptions {
  const isClosed = recruitment.status === "closed";
  const vcText = recruitment.voiceChannelId
    ? loc.recruitmentPostVc({ id: recruitment.voiceChannelId })
    : loc.recruitmentPostNoVc;

  const participantText =
    participantIds.length > 0
      ? `${loc.recruitmentParticipantsLabel}\n${participantIds.map((id) => `<@${id}>`).join("\n")}`
      : loc.recruitmentNoParticipants;

  const queueText =
    queuedIds.length > 0
      ? `${loc.recruitmentQueueLabel}\n${queuedIds.map((id) => `<@${id}>`).join("\n")}`
      : null;

  const closeOrReopenButton = isClosed
    ? {
        type: ComponentType.Button as const,
        customId: createRecruitmentCustomId("reopen", recruitment.id),
        label: loc.recruitmentButtonReopen,
        style: ButtonStyle.Success as const
      }
    : {
        type: ComponentType.Button as const,
        customId: createRecruitmentCustomId("close", recruitment.id),
        label: loc.recruitmentButtonClose,
        style: ButtonStyle.Danger as const
      };

  const containerComponents = [
    {
      type: ComponentType.TextDisplay,
      content: `## ${loc.recruitmentPostTitle({ title: recruitment.genre })}`
    },
    {
      type: ComponentType.TextDisplay,
      content: `${localizeStatus(recruitment.status, loc)}  ·  👥 ${activeParticipantCount} / ${recruitment.capacity}`
    },
    { type: ComponentType.Separator },
    {
      type: ComponentType.TextDisplay,
      content: recruitment.content
    },
    { type: ComponentType.Separator },
    {
      type: ComponentType.TextDisplay,
      content: loc.recruitmentPostCreator({ id: recruitment.creatorId })
    },
    {
      type: ComponentType.TextDisplay,
      content: vcText
    },
    {
      type: ComponentType.TextDisplay,
      content: participantText
    },
    ...(queueText
      ? [{ type: ComponentType.TextDisplay, content: queueText }]
      : [])
  ];

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        accent_color: EVENT_COLORS.teal,
        components: containerComponents
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            customId: createRecruitmentCustomId("join", recruitment.id),
            label: loc.recruitmentButtonJoin,
            style: ButtonStyle.Primary,
            disabled: isClosed
          },
          {
            type: ComponentType.Button,
            customId: createRecruitmentCustomId("leave", recruitment.id),
            label: loc.recruitmentButtonLeave,
            style: ButtonStyle.Secondary
          },
          closeOrReopenButton
        ]
      }
    ]
  };
}

function isRecruitmentAction(value: string | undefined): value is RecruitmentAction {
  return (
    value === "close" || value === "join" || value === "leave" ||
    value === "reopen"
  );
}
