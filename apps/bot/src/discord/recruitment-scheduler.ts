import type { Client, TextChannel } from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  closeRecruitment,
  listExpiredOpenRecruitments,
  listUpcomingDeadlineRecruitments,
  listActiveRecruitmentParticipants,
  listQueuedParticipants
} from "@discord-bot/db";
import {
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS,
  RECRUITMENT_SCHEDULER_INTERVAL_MS
} from "@discord-bot/shared";

import { createRecruitmentPostMessage } from "./recruitment-channel.js";
import type { DiscordLogWriter } from "./log-writer.js";
import { writeRecruitmentLifecycleLog } from "./recruitment-logs.js";
import { resolveGuildLocale } from "./resolve-locale.js";

export interface RecruitmentSchedulerContext {
  db: DbClient;
  discordClient: Client;
  logWriter?: DiscordLogWriter;
}

export function installRecruitmentScheduler(context: RecruitmentSchedulerContext): void {
  const { db, discordClient, logWriter } = context;

  const tick = async () => {
    const now = Date.now();

    await closeExpiredRecruitments(db, discordClient, logWriter, now);
    await updateCountdownMessages(db, discordClient, now);
  };

  setInterval(() => {
    tick().catch((error: unknown) => {
      console.warn("recruitment scheduler tick failed", { error });
    });
  }, RECRUITMENT_SCHEDULER_INTERVAL_MS);
}

async function closeExpiredRecruitments(
  db: DbClient,
  discordClient: Client,
  logWriter: DiscordLogWriter | undefined,
  now: number
): Promise<void> {
  const expired = await listExpiredOpenRecruitments(db);

  for (const recruitment of expired) {
    const closed = await closeRecruitment(db, { recruitmentId: recruitment.id });
    if (!closed) continue;

    await editRecruitmentMessage(db, discordClient, closed);

    if (logWriter) {
      writeRecruitmentLifecycleLog(logWriter, "recruitment.expired", {
        recruitment: closed,
        actorId: closed.creatorId,
        reason: "deadline_expired"
      });
    }

    console.log("recruitment auto-closed by deadline", {
      recruitmentId: recruitment.id,
      deadlineAt: recruitment.deadlineAt,
      now: new Date(now).toISOString()
    });
  }
}

async function updateCountdownMessages(
  db: DbClient,
  discordClient: Client,
  now: number
): Promise<void> {
  const upcoming = await listUpcomingDeadlineRecruitments(db, COUNTDOWN_THRESHOLD_24H_MS);

  for (const recruitment of upcoming) {
    if (!recruitment.deadlineAt) continue;

    const msLeft = recruitment.deadlineAt.getTime() - now;

    const shouldUpdate =
      msLeft < COUNTDOWN_THRESHOLD_1H_MS ||
      (msLeft < COUNTDOWN_THRESHOLD_24H_MS && now % COUNTDOWN_THRESHOLD_1H_MS < RECRUITMENT_SCHEDULER_INTERVAL_MS);

    if (shouldUpdate) {
      await editRecruitmentMessage(db, discordClient, recruitment);
    }
  }
}

async function editRecruitmentMessage(
  db: DbClient,
  discordClient: Client,
  recruitment: Awaited<ReturnType<typeof listExpiredOpenRecruitments>>[number]
): Promise<void> {
  if (!recruitment.messageId) return;

  const channel = await discordClient.channels.fetch(recruitment.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await (channel as TextChannel).messages
    .fetch(recruitment.messageId)
    .catch(() => null);
  if (!message) return;

  const loc = await resolveGuildLocale(db, recruitment.guildId);
  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(db, recruitment.id),
    listQueuedParticipants(db, recruitment.id)
  ]);

  await message.edit({
    ...createRecruitmentPostMessage(
      recruitment,
      loc,
      participants.length,
      participants.map((p) => p.userId),
      queued.map((p) => p.userId)
    ),
    allowedMentions: { parse: [] }
  }).catch((error: unknown) => {
    console.warn("failed to edit recruitment message in scheduler", {
      recruitmentId: recruitment.id,
      messageId: recruitment.messageId,
      error
    });
  });
}
