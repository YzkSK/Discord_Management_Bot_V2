import { ensureDashboardAccessGrant, type DbClient } from "@discord-bot/db";
import { Events, type Client } from "discord.js";

export function installMemberAutoGrantHandlers(client: Client, db: DbClient) {
  client.on(Events.GuildMemberAdd, (member) => {
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
}
