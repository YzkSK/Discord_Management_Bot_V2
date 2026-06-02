import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { callSessionMembers, callSessions } from "../schema/index.js";

export interface CreateCallSessionInput {
  channelId: string;
  guildId: string;
  startedAt?: Date;
}

export async function createCallSession(
  db: DbClient,
  input: CreateCallSessionInput
) {
  const [callSession] = await db
    .insert(callSessions)
    .values({
      channelId: input.channelId,
      guildId: input.guildId,
      startedAt: input.startedAt ?? new Date(),
      status: "active"
    })
    .returning();

  if (!callSession) {
    throw new Error("Failed to create call session.");
  }

  return callSession;
}

export async function getActiveCallSessionByChannelId(
  db: DbClient,
  input: { channelId: string; guildId: string }
) {
  const [callSession] = await db
    .select()
    .from(callSessions)
    .where(
      and(
        eq(callSessions.guildId, input.guildId),
        eq(callSessions.channelId, input.channelId),
        eq(callSessions.status, "active")
      )
    )
    .limit(1);

  return callSession ?? null;
}

export async function endCallSession(
  db: DbClient,
  input: { callSessionId: string; endedAt?: Date }
) {
  const [callSession] = await db
    .update(callSessions)
    .set({
      endedAt: input.endedAt ?? new Date(),
      status: "ended",
      updatedAt: sql`now()`
    })
    .where(eq(callSessions.id, input.callSessionId))
    .returning();

  return callSession ?? null;
}

export async function upsertCallSessionMember(
  db: DbClient,
  input: { callSessionId: string; joinedAt?: Date; userId: string }
) {
  const joinOrder = await nextJoinOrder(db, input.callSessionId);
  const [member] = await db
    .insert(callSessionMembers)
    .values({
      callSessionId: input.callSessionId,
      joinedAt: input.joinedAt ?? new Date(),
      joinOrder,
      leftAt: null,
      userId: input.userId
    })
    .onConflictDoUpdate({
      target: [callSessionMembers.callSessionId, callSessionMembers.userId],
      set: {
        leftAt: null,
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!member) {
    throw new Error("Failed to upsert call session member.");
  }

  return member;
}

export async function markCallSessionMemberLeft(
  db: DbClient,
  input: { callSessionId: string; leftAt?: Date; userId: string }
) {
  const [member] = await db
    .update(callSessionMembers)
    .set({
      leftAt: input.leftAt ?? new Date(),
      updatedAt: sql`now()`
    })
    .where(
      and(
        eq(callSessionMembers.callSessionId, input.callSessionId),
        eq(callSessionMembers.userId, input.userId)
      )
    )
    .returning();

  return member ?? null;
}

export async function listActiveCallSessionMembers(
  db: DbClient,
  callSessionId: string
) {
  return db
    .select()
    .from(callSessionMembers)
    .where(
      and(
        eq(callSessionMembers.callSessionId, callSessionId),
        isNull(callSessionMembers.leftAt)
      )
    )
    .orderBy(asc(callSessionMembers.joinedAt), asc(callSessionMembers.joinOrder));
}

async function nextJoinOrder(db: DbClient, callSessionId: string) {
  const [result] = await db
    .select({
      value: sql<number>`coalesce(max(${callSessionMembers.joinOrder}), -1) + 1`
    })
    .from(callSessionMembers)
    .where(eq(callSessionMembers.callSessionId, callSessionId));

  return result?.value ?? 0;
}
