import { and, asc, count, desc, eq, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { recruitmentParticipants, recruitments } from "../schema/index.js";

const DEFAULT_RECRUITMENTS_LIMIT = 50;

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
  deadlineAt: Date;
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
      deadlineAt: input.deadlineAt,
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

export async function listRecruitmentDashboardState(
  db: DbClient,
  input: { guildId: string; limit?: number }
) {
  const activeCounts = db
    .select({
      activeParticipantCount: count(recruitmentParticipants.id).as(
        "active_participant_count"
      ),
      recruitmentId: recruitmentParticipants.recruitmentId
    })
    .from(recruitmentParticipants)
    .where(isNull(recruitmentParticipants.leftAt))
    .groupBy(recruitmentParticipants.recruitmentId)
    .as("active_counts");

  return db
    .select({
      activeParticipantCount: sql<number>`coalesce(${activeCounts.activeParticipantCount}, 0)`,
      capacity: recruitments.capacity,
      channelId: recruitments.channelId,
      closedAt: recruitments.closedAt,
      deadlineAt: recruitments.deadlineAt,
      content: recruitments.content,
      createdAt: recruitments.createdAt,
      creatorId: recruitments.creatorId,
      genre: recruitments.genre,
      id: recruitments.id,
      messageId: recruitments.messageId,
      status: sql<RecruitmentStatus>`${recruitments.status}`,
      updatedAt: recruitments.updatedAt,
      voiceChannelId: recruitments.voiceChannelId
    })
    .from(recruitments)
    .leftJoin(activeCounts, eq(recruitments.id, activeCounts.recruitmentId))
    .where(eq(recruitments.guildId, input.guildId))
    .orderBy(desc(recruitments.createdAt))
    .limit(input.limit ?? DEFAULT_RECRUITMENTS_LIMIT);
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
        isNull(recruitmentParticipants.leftAt),
        eq(recruitmentParticipants.isQueued, false)
      )
    )
    .orderBy(asc(recruitmentParticipants.joinedAt));
}

export async function listQueuedParticipants(
  db: DbClient,
  recruitmentId: string
) {
  return db
    .select()
    .from(recruitmentParticipants)
    .where(
      and(
        eq(recruitmentParticipants.recruitmentId, recruitmentId),
        isNull(recruitmentParticipants.leftAt),
        eq(recruitmentParticipants.isQueued, true)
      )
    )
    .orderBy(asc(recruitmentParticipants.queuedAt));
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
        isNull(recruitmentParticipants.leftAt),
        eq(recruitmentParticipants.isQueued, false)
      )
    );

  return result?.value ?? 0;
}

export async function getActiveParticipant(
  db: DbClient,
  input: { recruitmentId: string; userId: string }
) {
  const [participant] = await db
    .select()
    .from(recruitmentParticipants)
    .where(
      and(
        eq(recruitmentParticipants.recruitmentId, input.recruitmentId),
        eq(recruitmentParticipants.userId, input.userId),
        isNull(recruitmentParticipants.leftAt)
      )
    )
    .limit(1);

  return participant ?? null;
}

export async function joinRecruitment(
  db: DbClient,
  input: { recruitmentId: string; userId: string; isQueued?: boolean; joinedAt?: Date; queuedAt?: Date | null }
) {
  const isQueued = input.isQueued ?? false;
  const queuedAt = isQueued ? (input.queuedAt ?? new Date()) : null;

  const [participant] = await db
    .insert(recruitmentParticipants)
    .values({
      recruitmentId: input.recruitmentId,
      userId: input.userId,
      joinedAt: input.joinedAt ?? new Date(),
      leftAt: null,
      isQueued,
      queuedAt
    })
    .onConflictDoUpdate({
      target: [
        recruitmentParticipants.recruitmentId,
        recruitmentParticipants.userId
      ],
      set: {
        leftAt: null,
        isQueued,
        queuedAt,
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
    closedAt?: Date | null;
  }
) {
  const [recruitment] = await db
    .update(recruitments)
    .set({
      status: input.status,
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
  input: { recruitmentId: string; closedAt?: Date }
) {
  return updateRecruitmentStatus(db, {
    recruitmentId: input.recruitmentId,
    status: "closed",
    closedAt: input.closedAt ?? new Date()
  });
}

export async function setRecruitmentDeadline(
  db: DbClient,
  input: { recruitmentId: string; deadlineAt: Date }
) {
  const [recruitment] = await db
    .update(recruitments)
    .set({ deadlineAt: input.deadlineAt, updatedAt: sql`now()` })
    .where(eq(recruitments.id, input.recruitmentId))
    .returning();

  return recruitment ?? null;
}

export async function reopenRecruitment(
  db: DbClient,
  input: { recruitmentId: string; status: RecruitmentStatus; deadlineAt: Date }
) {
  const [recruitment] = await db
    .update(recruitments)
    .set({
      status: input.status,
      closedAt: null,
      deadlineAt: input.deadlineAt,
      updatedAt: sql`now()`
    })
    .where(eq(recruitments.id, input.recruitmentId))
    .returning();

  return recruitment ?? null;
}

export async function listExpiredOpenRecruitments(db: DbClient) {
  return db
    .select()
    .from(recruitments)
    .where(
      and(
        ne(recruitments.status, "closed"),
        isNotNull(recruitments.deadlineAt),
        lte(recruitments.deadlineAt, sql`now()`)
      )
    );
}

export async function listUpcomingDeadlineRecruitments(
  db: DbClient,
  thresholdMs: number
) {
  return db
    .select()
    .from(recruitments)
    .where(
      and(
        ne(recruitments.status, "closed"),
        isNotNull(recruitments.deadlineAt),
        lte(
          recruitments.deadlineAt,
          sql`now() + (${thresholdMs} * interval '1 millisecond')`
        )
      )
    );
}

export function resolveRecruitmentStatus(input: {
  capacity: number;
  activeParticipantCount: number;
  currentStatus?: RecruitmentStatus;
}) {
  if (input.currentStatus === "closed") {
    return "closed";
  }

  if (input.activeParticipantCount >= input.capacity) {
    return "full";
  }

  return "open";
}

export async function promoteFromQueue(
  db: DbClient,
  recruitmentId: string
) {
  return db.transaction(async (tx) => {
    const [first] = await tx
      .select()
      .from(recruitmentParticipants)
      .where(
        and(
          eq(recruitmentParticipants.recruitmentId, recruitmentId),
          isNull(recruitmentParticipants.leftAt),
          eq(recruitmentParticipants.isQueued, true)
        )
      )
      .orderBy(asc(recruitmentParticipants.queuedAt))
      .limit(1);

    if (!first) return null;

    const [updated] = await tx
      .update(recruitmentParticipants)
      .set({ isQueued: false, queuedAt: null, updatedAt: sql`now()` })
      .where(eq(recruitmentParticipants.id, first.id))
      .returning();

    return updated ? { userId: updated.userId } : null;
  });
}
