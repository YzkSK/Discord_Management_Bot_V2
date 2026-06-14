import type { DbClient } from "@discord-bot/db";
import {
  endCallSession,
  listActiveCallSessionMembers,
  listAllActiveCallSessions,
  markCallSessionMemberLeft
} from "@discord-bot/db";
import { Events, type Client } from "discord.js";

export function installVoiceReconciliation(client: Client, db: DbClient) {
  client.once(Events.ClientReady, (readyClient) => {
    void reconcileVoiceSessions(readyClient, db).catch((error: unknown) => {
      console.error("voice session reconciliation failed", error);
    });
  });
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
      ended++;
    }
  }

  console.log("voice reconciliation complete", { ended, cleaned });
}
