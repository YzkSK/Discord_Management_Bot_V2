import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { clampLimit } from "./pagination.js";
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
  const [sessionRows, tempVoiceRows] = await Promise.all([
    db
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
      .limit(clampLimit(input.recentLimit, DEFAULT_RECENT_LIMIT, MAX_RECENT_LIMIT)),
    db
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
      .orderBy(desc(tempVoiceChannels.createdAt))
  ]);

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

const DEFAULT_RECENT_LIMIT = 20;
const MAX_RECENT_LIMIT = 50;
