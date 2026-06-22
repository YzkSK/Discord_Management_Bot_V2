import type { DbClient } from "@discord-bot/db";
import {
  endCallSession,
  listActiveCallSessionMembers,
  listAllActiveCallSessions,
  markCallSessionMemberLeft,
  upsertCallSessionMember
} from "@discord-bot/db";
import { Events, type Client, type Guild } from "discord.js";

import { updateDiscordVoiceStatusMessage } from "./voice-activity.js";

const reconcileIntervalMs = 2 * 60 * 1000; // 2分

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
  let added = 0;

  for (const session of guildSessions) {
    const counts = await reconcileSession(session, guild, guild.client, db, now);
    ended += counts.ended;
    cleaned += counts.cleaned;
    added += counts.added;
  }

  if (ended > 0 || cleaned > 0 || added > 0) {
    console.log("voice guild reconciliation complete", { guildId: guild.id, ended, cleaned, added });
  }
}

async function reconcileVoiceSessions(client: Client, db: DbClient) {
  const activeSessions = await listAllActiveCallSessions(db);
  console.log("voice reconciliation: start", {
    activeSessionCount: activeSessions.length,
    cachedGuildIds: [...client.guilds.cache.keys()]
  });
  if (activeSessions.length === 0) return;

  const now = new Date();
  let ended = 0;
  let cleaned = 0;
  let added = 0;

  for (const session of activeSessions) {
    const guild = client.guilds.cache.get(session.guildId);
    if (!guild) {
      console.log("voice reconciliation: guild not in cache, skipping", { guildId: session.guildId, sessionId: session.id });
      continue;
    }

    const counts = await reconcileSession(session, guild, client, db, now);
    ended += counts.ended;
    cleaned += counts.cleaned;
    added += counts.added;
  }

  if (ended > 0 || cleaned > 0 || added > 0) {
    console.log("voice reconciliation complete", { ended, cleaned, added });
  }
}

async function reconcileSession(
  session: Awaited<ReturnType<typeof listAllActiveCallSessions>>[number],
  guild: Guild,
  client: Client,
  db: DbClient,
  now: Date
): Promise<{ ended: number; cleaned: number; added: number }> {
  const channel = guild.channels.cache.get(session.channelId);
  const actualHumanIds = new Set(
    channel?.isVoiceBased()
      ? [...channel.members.values()]
          .filter((m) => !m.user.bot)
          .map((m) => m.id)
      : []
  );

  const dbActiveMembers = await listActiveCallSessionMembers(db, session.id);
  const dbActiveMemberIds = new Set(dbActiveMembers.map((m) => m.userId));

  console.log("voice reconciliation: session check", {
    sessionId: session.id,
    channelId: session.channelId,
    channelInCache: !!channel,
    channelIsVoice: channel?.isVoiceBased() ?? false,
    discordMemberIds: [...actualHumanIds],
    dbMemberIds: [...dbActiveMemberIds]
  });

  let cleaned = 0;
  let added = 0;

  // DB にいるが Discord にいない → 幽霊メンバーを除去
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

  // Discord にいるが DB にいない → 取りこぼした join を補完
  for (const userId of actualHumanIds) {
    if (!dbActiveMemberIds.has(userId)) {
      await upsertCallSessionMember(db, {
        callSessionId: session.id,
        joinedAt: now,
        userId
      });
      added++;
    }
  }

  const remaining = [...actualHumanIds];
  if (cleaned > 0 || added > 0) {
    console.log("voice reconciliation: fixed members", {
      sessionId: session.id,
      cleaned,
      added,
      remaining: remaining.length
    });
  }

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
    return { ended: 1, cleaned, added };
  }

  if (cleaned > 0 || added > 0) {
    await updateDiscordVoiceStatusMessage(client, db, {
      activeMemberCount: remaining.length,
      memberIds: remaining,
      session,
      state: "active"
    }).catch((err: unknown) => {
      console.warn("voice reconciliation: failed to update status message", { sessionId: session.id, err });
    });
  }

  return { ended: 0, cleaned, added };
}
