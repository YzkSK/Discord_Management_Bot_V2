import { eq, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import {
  callSessions,
  tempVoiceChannels
} from "../schema/index.js";
import { upsertCallSessionMember } from "./call-sessions.js";

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

