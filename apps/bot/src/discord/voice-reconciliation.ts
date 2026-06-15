import type { DbClient } from "@discord-bot/db";
import {
  endCallSession,
  listActiveCallSessionMembers,
  listAllActiveCallSessions,
  markCallSessionMemberLeft
} from "@discord-bot/db";
import { Events, type Client, type Guild } from "discord.js";

import { updateDiscordVoiceStatusMessage } from "./voice-activity.js";

const reconcileIntervalMs = 10 * 60 * 1000; // 10分

export function installVoiceReconciliation(client: Client, db: DbClient) {
  client.once(Events.ClientReady, (readyClient) => {
    void reconcileVoiceSessions(readyClient, db).catch((error: unknown) => {
      console.error("voice session reconciliation failed", error);
    });

    setInterval(() => {
      void reconcileVoiceSessions(readyClient, db).catch((error: unknown) => {
        console.error("voice session periodic reconciliation failed", error);
      });
    }, reconcileIntervalMs);
  });

  client.on(Events.GuildAvailable, (guild) => {
    void reconcileGuildVoiceSessions(guild, db).catch((error: unknown) => {
      console.error("voice session guild reconciliation failed", { guildId: guild.id, error });
    });
  });
}

async function reconcileGuildVoiceSessions(guild: Guild, db: DbClient) {
  const activeSessions = await listAllActiveCallSessions(db);
  const guildSessions = activeSessions.filter((s) => s.guildId === guild.id);
  if (guildSessions.length === 0) return;

  const now = new Date();
  let ended = 0;
  let cleaned = 0;

  for (const session of guildSessions) {
    const channel = guild.channels.cache.get(session.channelId);
    const actualHumanIds = new Set(
      channel?.isVoiceBased()
        ? [...channel.members.values()]
            .filter((m) => !m.user.bot)
            .map((m) => m.id)
        : []
    );

    const dbActiveMembers = await listActiveCallSessionMembers(db, session.id);
    for (const member of dbActiveMembers) {
      if (!actualHumanIds.has(member.userId)) {
        await markCallSessionMemberLeft(db, {
          callSessionId: session.id,
          leftAt: now,
          userId: member.userId
        });
        cleaned++;
      }
    }

    const remaining = dbActiveMembers.filter((m) => actualHumanIds.has(m.userId));
    if (remaining.length === 0) {
      await endCallSession(db, { callSessionId: session.id, endedAt: now });
      await updateDiscordVoiceStatusMessage(guild.client, db, {
        activeMemberCount: 0,
        endedAt: now,
        session,
        state: "ended"
      }).catch((err: unknown) => {
        console.warn("voice reconciliation: failed to update status message", { sessionId: session.id, err });
      });
      ended++;
    }
  }

  if (ended > 0 || cleaned > 0) {
    console.log("voice guild reconciliation complete", { guildId: guild.id, ended, cleaned });
  }
}

async function reconcileVoiceSessions(client: Client, db: DbClient) {
  const activeSessions = await listAllActiveCallSessions(db);
  if (activeSessions.length === 0) return;

  let ended = 0;
  let cleaned = 0;
  const now = new Date();

  for (const session of activeSessions) {
    const guild = client.guilds.cache.get(session.guildId);
    if (!guild) continue;

    const channel = guild.channels.cache.get(session.channelId);
    const actualHumanIds = new Set(
      channel?.isVoiceBased()
        ? [...channel.members.values()]
            .filter((m) => !m.user.bot)
            .map((m) => m.id)
        : []
    );

    const dbActiveMembers = await listActiveCallSessionMembers(db, session.id);
    for (const member of dbActiveMembers) {
      if (!actualHumanIds.has(member.userId)) {
        await markCallSessionMemberLeft(db, {
          callSessionId: session.id,
          leftAt: now,
          userId: member.userId
        });
        cleaned++;
      }
    }

    const remaining = dbActiveMembers.filter((m) =>
      actualHumanIds.has(m.userId)
    );
    if (remaining.length === 0) {
      await endCallSession(db, { callSessionId: session.id, endedAt: now });
      await updateDiscordVoiceStatusMessage(client, db, {
        activeMemberCount: 0,
        endedAt: now,
        session,
        state: "ended"
      }).catch((err: unknown) => {
        console.warn("voice reconciliation: failed to update status message", { sessionId: session.id, err });
      });
      ended++;
    }
  }

  console.log("voice reconciliation complete", { ended, cleaned });
}
