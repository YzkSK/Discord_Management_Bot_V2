import {
  ChannelType,
  type Guild,
  type TextChannel
} from "discord.js";
import type { createRecruitment } from "@discord-bot/db";

import { createComponentsV2TextMessage } from "./components-v2.js";

export const recruitmentChannelTopicMarker =
  "[discord-management-bot:recruitment]";

type Recruitment = Awaited<ReturnType<typeof createRecruitment>>;

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

export function createRecruitmentPostMessage(recruitment: Recruitment) {
  return createComponentsV2TextMessage({
    title: `Recruitment: ${recruitment.genre}`,
    lines: [
      `Status: ${recruitment.status}`,
      `Capacity: 0/${recruitment.capacity}`,
      `Creator: <@${recruitment.creatorId}>`,
      recruitment.voiceChannelId
        ? `VC: <#${recruitment.voiceChannelId}>`
        : "VC: none",
      `Auto close: ${recruitment.autoClose ? "on" : "off"}`,
      "",
      recruitment.content
    ]
  });
}
