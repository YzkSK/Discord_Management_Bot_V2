import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import {
  callSessionMembers,
  callSessions,
  discordChannels,
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
      channelName: discordChannels.name,
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
    .leftJoin(
      discordChannels,
      eq(discordChannels.channelId, callSessions.channelId)
    )
    .where(eq(callSessions.guildId, input.guildId))
    .groupBy(
      callSessions.id,
      callSessions.channelId,
      callSessions.endedAt,
      callSessions.startedAt,
      callSessions.status,
      discordChannels.name
    )
    .orderBy(desc(callSessions.startedAt))
    .limit(clampRecentLimit(input.recentLimit));

  const tempVoiceRows = await db
    .select({
      channelId: tempVoiceChannels.channelId,
      channelName: discordChannels.name,
      controlChannelId: tempVoiceChannels.controlChannelId,
      creationChannelId: tempVoiceChannels.creationChannelId,
      deleteScheduledAt: tempVoiceChannels.deleteScheduledAt,
      ownerId: tempVoiceChannels.ownerId
    })
    .from(tempVoiceChannels)
    .leftJoin(
      discordChannels,
      eq(discordChannels.channelId, tempVoiceChannels.channelId)
    )
    .where(eq(tempVoiceChannels.guildId, input.guildId))
    .orderBy(desc(tempVoiceChannels.createdAt));

  return {
    sessions: sessionRows.map((session) => {
      const { channelName, ...rest } = session;
      return {
        ...rest,
        ...(channelName !== null ? { channelName } : {}),
        status: rest.status === "ended" ? ("ended" as const) : ("active" as const)
      };
    }),
    tempVoiceChannels: tempVoiceRows.map((vc) => {
      const { channelName, ...rest } = vc;
      return {
        ...rest,
        ...(channelName !== null ? { channelName } : {})
      };
    })
  };
}

function clampRecentLimit(limit = 20) {
  if (!Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}
