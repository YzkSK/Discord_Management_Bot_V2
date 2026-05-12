import { and, asc, count, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { recruitmentParticipants, recruitments } from "../schema/index.js";

export const recruitmentStatuses = ["open", "full", "closed"] as const;

export type RecruitmentStatus = (typeof recruitmentStatuses)[number];

export interface CreateRecruitmentInput {
  guildId: string;
  channelId: string;
  creatorId: string;
  genre: string;
  capacity: number;
  content: string;
  voiceChannelId?: string | null;
  autoClose?: boolean;
}

export async function createRecruitment(
  db: DbClient,
  input: CreateRecruitmentInput
) {
  const [recruitment] = await db
    .insert(recruitments)
    .values({
      guildId: input.guildId,
      channelId: input.channelId,
      creatorId: input.creatorId,
      genre: input.genre,
      capacity: input.capacity,
      content: input.content,
      voiceChannelId: input.voiceChannelId ?? null,
      autoClose: input.autoClose ?? true,
      status: "open"
    })
    .returning();

  if (!recruitment) {
    throw new Error("Failed to create recruitment.");
  }

  return recruitment;
}

export async function setRecruitmentMessageId(
  db: DbClient,
  input: { recruitmentId: string; messageId: string }
) {
  const [recruitment] = await db
    .update(recruitments)
    .set({
      messageId: input.messageId,
      updatedAt: sql`now()`
    })
    .where(eq(recruitments.id, input.recruitmentId))
    .returning();

  return recruitment ?? null;
}

export async function getRecruitmentById(db: DbClient, recruitmentId: string) {
  const [recruitment] = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.id, recruitmentId))
    .limit(1);

  return recruitment ?? null;
}

export async function getRecruitmentByMessageId(
  db: DbClient,
  messageId: string
) {
  const [recruitment] = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.messageId, messageId))
    .limit(1);

  return recruitment ?? null;
}

export async function listActiveRecruitmentParticipants(
  db: DbClient,
  recruitmentId: string
) {
  return db
    .select()
    .from(recruitmentParticipants)
    .where(
      and(
        eq(recruitmentParticipants.recruitmentId, recruitmentId),
        isNull(recruitmentParticipants.leftAt)
      )
    )
    .orderBy(asc(recruitmentParticipants.joinedAt));
}

export async function countActiveRecruitmentParticipants(
  db: DbClient,
  recruitmentId: string
) {
  const [result] = await db
    .select({ value: count() })
    .from(recruitmentParticipants)
    .where(
      and(
        eq(recruitmentParticipants.recruitmentId, recruitmentId),
        isNull(recruitmentParticipants.leftAt)
      )
    );

  return result?.value ?? 0;
}

export async function joinRecruitment(
  db: DbClient,
  input: { recruitmentId: string; userId: string; joinedAt?: Date }
) {
  const [participant] = await db
    .insert(recruitmentParticipants)
    .values({
      recruitmentId: input.recruitmentId,
      userId: input.userId,
      joinedAt: input.joinedAt ?? new Date(),
      leftAt: null
    })
    .onConflictDoUpdate({
      target: [
        recruitmentParticipants.recruitmentId,
        recruitmentParticipants.userId
      ],
      set: {
        leftAt: null,
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!participant) {
    throw new Error("Failed to join recruitment.");
  }

  return participant;
}

export async function leaveRecruitment(
  db: DbClient,
  input: { recruitmentId: string; userId: string; leftAt?: Date }
) {
  const [participant] = await db
    .update(recruitmentParticipants)
    .set({
      leftAt: input.leftAt ?? new Date(),
      updatedAt: sql`now()`
    })
    .where(
      and(
        eq(recruitmentParticipants.recruitmentId, input.recruitmentId),
        eq(recruitmentParticipants.userId, input.userId)
      )
    )
    .returning();

  return participant ?? null;
}

export async function updateRecruitmentStatus(
  db: DbClient,
  input: {
    recruitmentId: string;
    status: RecruitmentStatus;
    autoClosed?: boolean;
    closedAt?: Date | null;
  }
) {
  const [recruitment] = await db
    .update(recruitments)
    .set({
      status: input.status,
      autoClosed: input.autoClosed ?? false,
      closedAt:
        input.closedAt === undefined
          ? input.status === "closed"
            ? new Date()
            : null
          : input.closedAt,
      updatedAt: sql`now()`
    })
    .where(eq(recruitments.id, input.recruitmentId))
    .returning();

  return recruitment ?? null;
}

export async function closeRecruitment(
  db: DbClient,
  input: { recruitmentId: string; closedAt?: Date; autoClosed?: boolean }
) {
  return updateRecruitmentStatus(db, {
    recruitmentId: input.recruitmentId,
    status: "closed",
    autoClosed: input.autoClosed ?? false,
    closedAt: input.closedAt ?? new Date()
  });
}

export function resolveRecruitmentStatus(input: {
  capacity: number;
  activeParticipantCount: number;
  autoClose: boolean;
  currentStatus?: RecruitmentStatus;
}) {
  if (input.currentStatus === "closed") {
    return "closed";
  }

  if (input.activeParticipantCount >= input.capacity) {
    return input.autoClose ? "closed" : "full";
  }

  return "open";
}
