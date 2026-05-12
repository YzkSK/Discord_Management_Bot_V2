import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import {
  callSessionMembers,
  callSessions,
  tempVoiceChannels
} from "../schema/index.js";

export interface CreateTempVoiceChannelInput {
  guildId: string;
  channelId: string;
  ownerId: string;
  creationChannelId: string;
  controlChannelId?: string | null;
}

export async function createTempVoiceChannel(
  db: DbClient,
  input: CreateTempVoiceChannelInput
) {
  const [callSession] = await db
    .insert(callSessions)
    .values({
      guildId: input.guildId,
      channelId: input.channelId,
      status: "active"
    })
    .returning();

  if (!callSession) {
    throw new Error("Failed to create call session.");
  }

  const [tempVoiceChannel] = await db
    .insert(tempVoiceChannels)
    .values({
      guildId: input.guildId,
      channelId: input.channelId,
      ownerId: input.ownerId,
      creationChannelId: input.creationChannelId,
      controlChannelId: input.controlChannelId ?? null,
      callSessionId: callSession.id
    })
    .returning();

  if (!tempVoiceChannel) {
    throw new Error("Failed to create temp voice channel.");
  }

  await upsertCallSessionMember(db, {
    callSessionId: callSession.id,
    userId: input.ownerId
  });

  return { callSession, tempVoiceChannel };
}

export async function getActiveTempVoiceChannelByChannelId(
  db: DbClient,
  channelId: string
) {
  const [result] = await db
    .select()
    .from(tempVoiceChannels)
    .where(eq(tempVoiceChannels.channelId, channelId))
    .limit(1);

  return result ?? null;
}

export async function upsertCallSessionMember(
  db: DbClient,
  input: { callSessionId: string; userId: string; joinedAt?: Date }
) {
  const joinOrder = await nextJoinOrder(db, input.callSessionId);
  const [member] = await db
    .insert(callSessionMembers)
    .values({
      callSessionId: input.callSessionId,
      userId: input.userId,
      joinOrder,
      joinedAt: input.joinedAt ?? new Date(),
      leftAt: null
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
  input: { callSessionId: string; userId: string; leftAt?: Date }
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

export async function transferTempVoiceChannelOwner(
  db: DbClient,
  input: { channelId: string; ownerId: string }
) {
  const [tempVoiceChannel] = await db
    .update(tempVoiceChannels)
    .set({
      ownerId: input.ownerId,
      updatedAt: sql`now()`
    })
    .where(eq(tempVoiceChannels.channelId, input.channelId))
    .returning();

  return tempVoiceChannel ?? null;
}

export async function scheduleTempVoiceChannelDelete(
  db: DbClient,
  input: { channelId: string; deleteScheduledAt?: Date }
) {
  const [tempVoiceChannel] = await db
    .update(tempVoiceChannels)
    .set({
      deleteScheduledAt: input.deleteScheduledAt ?? new Date(),
      updatedAt: sql`now()`
    })
    .where(eq(tempVoiceChannels.channelId, input.channelId))
    .returning();

  return tempVoiceChannel ?? null;
}

export async function clearTempVoiceChannelDeleteSchedule(
  db: DbClient,
  channelId: string
) {
  const [tempVoiceChannel] = await db
    .update(tempVoiceChannels)
    .set({
      deleteScheduledAt: null,
      updatedAt: sql`now()`
    })
    .where(eq(tempVoiceChannels.channelId, channelId))
    .returning();

  return tempVoiceChannel ?? null;
}

export async function endTempVoiceChannel(
  db: DbClient,
  input: { channelId: string; endedAt?: Date }
) {
  const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
    db,
    input.channelId
  );

  if (!tempVoiceChannel?.callSessionId) {
    return null;
  }

  await db
    .update(callSessions)
    .set({
      status: "ended",
      endedAt: input.endedAt ?? new Date(),
      updatedAt: sql`now()`
    })
    .where(eq(callSessions.id, tempVoiceChannel.callSessionId));

  const [deletedTempVoiceChannel] = await db
    .delete(tempVoiceChannels)
    .where(eq(tempVoiceChannels.channelId, input.channelId))
    .returning();

  return deletedTempVoiceChannel ?? null;
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
