import type { NormalizedEvent } from "@discord-bot/shared";

import type { DiscordLogWriter } from "./log-writer.js";

export interface RecruitmentLogInput {
  recruitment: {
    id: string;
    guildId: string;
    channelId: string;
    messageId: string | null;
    creatorId: string;
    genre: string;
    capacity: number;
    voiceChannelId: string | null;
    status: string;
  };
  actorId: string;
  participantCount?: number;
  reason?: string;
}

export function writeRecruitmentLifecycleLog(
  logWriter: DiscordLogWriter,
  eventName: "recruitment.created" | "recruitment.full" | "recruitment.closed" | "recruitment.reopened" | "recruitment.expired",
  input: RecruitmentLogInput
) {
  const event = createRecruitmentEvent(eventName, input);

  void logWriter.write(event).catch((error: unknown) => {
    console.warn("failed to write recruitment lifecycle log", {
      eventName,
      guildId: event.guildId,
      recruitmentId: input.recruitment.id,
      error
    });
  });
}

export function createRecruitmentEvent(
  eventName: string,
  input: RecruitmentLogInput
): NormalizedEvent {
  const now = new Date();

  return {
    eventName,
    eventTimestamp: now,
    receivedAt: now,
    guildId: input.recruitment.guildId,
    actorId: input.actorId,
    channelId: input.recruitment.channelId,
    messageId: input.recruitment.messageId,
    payload: {
      recruitmentId: input.recruitment.id,
      creatorId: input.recruitment.creatorId,
      genre: input.recruitment.genre,
      capacity: input.recruitment.capacity,
      participantCount: input.participantCount ?? null,
      status: input.recruitment.status,
      voiceChannelId: input.recruitment.voiceChannelId,
      reason: input.reason ?? null
    }
  };
}
