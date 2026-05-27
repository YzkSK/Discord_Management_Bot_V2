import type { DiscordOAuthGuild } from "../../../discord-api.js";

const ADMINISTRATOR_BIT = BigInt(0x8);

export function hasDirectManagementPermission(
  guild: DiscordOAuthGuild
): boolean {
  if (guild.owner) return true;
  return (BigInt(guild.permissions) & ADMINISTRATOR_BIT) !== BigInt(0);
}
