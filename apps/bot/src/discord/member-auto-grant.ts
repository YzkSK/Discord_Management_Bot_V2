import {
  batchEnsureViewerAccess,
  ensureDashboardAccessGrant,
  pruneStaleUserGrants,
  revokeAllUserGrants,
  type DbClient
} from "@discord-bot/db";
import { Events, type Client } from "discord.js";

async function syncViewerGrantsForGuild(db: DbClient, guildId: string, client: Client) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const members = await guild.members.fetch();
  const userIds = members.filter((m) => !m.user.bot).map((m) => m.id);

  // 未付与メンバーに付与 → 退出済みメンバーの viewer を削除
  await batchEnsureViewerAccess(db, guildId, userIds);
  await pruneStaleUserGrants(db, guildId, userIds);
}

export function installMemberAutoGrantHandlers(client: Client, db: DbClient) {
  // 新規参加メンバーに viewer を付与
  client.on(Events.GuildMemberAdd, (member) => {
    if (member.user.bot) return;
    void ensureDashboardAccessGrant(db, {
      guildId: member.guild.id,
      targetType: "user",
      targetId: member.id,
      role: "viewer"
    }).catch((error: unknown) => {
      console.warn("failed to auto-grant viewer access on member join", {
        guildId: member.guild.id,
        userId: member.id,
        error
      });
    });
  });

  // 退出メンバーの viewer を剥奪（admin grant は残す）
  client.on(Events.GuildMemberRemove, (member) => {
    if (member.user.bot) return;
    void revokeAllUserGrants(db, member.guild.id, member.id).catch((error: unknown) => {
      console.warn("failed to revoke access grants on member leave", {
        guildId: member.guild.id,
        userId: member.id,
        error
      });
    });
  });

  // Bot 起動時: 全ギルドで付与漏れ追加 + 退出済みの viewer 削除（reconciliation）
  client.once(Events.ClientReady, (readyClient) => {
    const guildIds = [...readyClient.guilds.cache.keys()];
    void Promise.allSettled(
      guildIds.map((guildId) => syncViewerGrantsForGuild(db, guildId, readyClient))
    ).then((results) => {
      const failedGuildIds = guildIds.filter((_, i) => results[i]?.status === "rejected");
      if (failedGuildIds.length > 0) {
        console.warn(`viewer sync: ${failedGuildIds.length}/${guildIds.length} guilds failed`, { failedGuildIds });
      }
    });
  });

  // Bot が新しいギルドに参加したとき: そのギルドの全メンバーに viewer を付与
  client.on(Events.GuildCreate, (guild) => {
    void syncViewerGrantsForGuild(db, guild.id, client);
  });
}
