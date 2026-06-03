import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import {
  callSessionMembers,
  callSessions,
  tempVoiceChannels
} from "../schema/index.js";

export interface ListVoiceDashboardStateInput {
  guildId: string;
  recentLimit?: number;
}

export async function listVoiceDashboardState(
  db: DbClient,
  input: ListVoiceDashboardStateInput
) {
  const sessionRows = await db
    .select({
      channelId: callSessions.channelId,
      endedAt: callSessions.endedAt,
      id: callSessions.id,
      memberCount: sql<number>`count(${callSessionMembers.id})::int`,
      startedAt: callSessions.startedAt,
      status: callSessions.status
    })
    .from(callSessions)
    .leftJoin(
      callSessionMembers,
      and(
        eq(callSessionMembers.callSessionId, callSessions.id),
        isNull(callSessionMembers.leftAt)
      )
    )
    .where(eq(callSessions.guildId, input.guildId))
    .groupBy(
      callSessions.id,
      callSessions.channelId,
      callSessions.endedAt,
      callSessions.startedAt,
      callSessions.status
    )
    .orderBy(desc(callSessions.startedAt))
    .limit(clampRecentLimit(input.recentLimit));

  const tempVoiceRows = await db
    .select({
      channelId: tempVoiceChannels.channelId,
      controlChannelId: tempVoiceChannels.controlChannelId,
      creationChannelId: tempVoiceChannels.creationChannelId,
      deleteScheduledAt: tempVoiceChannels.deleteScheduledAt,
      ownerId: tempVoiceChannels.ownerId
    })
    .from(tempVoiceChannels)
    .where(eq(tempVoiceChannels.guildId, input.guildId))
    .orderBy(desc(tempVoiceChannels.createdAt));

  return {
    sessions: sessionRows.map((session) => ({
      ...session,
      status: session.status === "ended" ? ("ended" as const) : ("active" as const)
    })),
    tempVoiceChannels: tempVoiceRows
  };
}

function clampRecentLimit(limit = 20) {
  if (!Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}
