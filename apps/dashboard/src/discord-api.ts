export interface DiscordOAuthGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

export interface DiscordGuildMember {
  roles: string[];
}

export interface DiscordRole {
  id: string;
  name: string;
}

const discordApiBaseUrl = "https://discord.com/api/v10";

export class DiscordApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface GuildCacheEntry {
  guilds: DiscordOAuthGuild[];
  expiresAt: number;
}

// Avoid hammering Discord's /users/@me/guilds endpoint on every API request
const guildListCache = new Map<string, GuildCacheEntry>();
const GUILD_CACHE_TTL_MS = 60_000;

export async function fetchCurrentUserGuilds(
  accessToken: string
): Promise<DiscordOAuthGuild[]> {
  const cached = guildListCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.guilds;
  }

  const response = await fetch(`${discordApiBaseUrl}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new DiscordApiError(
      `Failed to load Discord guilds (${response.status}).`,
      response.status
    );
  }
  const guilds = (await response.json()) as DiscordOAuthGuild[];
  guildListCache.set(accessToken, { guilds, expiresAt: Date.now() + GUILD_CACHE_TTL_MS });
  return guilds;
}

export async function fetchCurrentUserGuildById(
  accessToken: string,
  guildId: string
): Promise<DiscordOAuthGuild | null> {
  const guilds = await fetchCurrentUserGuilds(accessToken);
  return guilds.find((g) => g.id === guildId) ?? null;
}

export async function fetchGuildMemberRoleIds(
  botToken: string,
  guildId: string,
  userId: string
): Promise<string[]> {
  const response = await fetch(
    `${discordApiBaseUrl}/guilds/${guildId}/members/${userId}`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store"
    }
  );
  if (response.status === 404 || response.status === 403) return [];
  if (!response.ok) {
    throw new DiscordApiError(
      `Failed to load Discord guild member (${response.status}).`
      ,
      response.status
    );
  }
  const member = (await response.json()) as DiscordGuildMember;
  return member.roles;
}

export async function fetchGuildRoles(
  botToken: string,
  guildId: string
): Promise<DiscordRole[]> {
  const response = await fetch(
    `${discordApiBaseUrl}/guilds/${guildId}/roles`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store"
    }
  );
  if (!response.ok) {
    throw new DiscordApiError(
      `Failed to load guild roles (${response.status}).`,
      response.status
    );
  }
  const roles = (await response.json()) as DiscordRole[];
  return roles.filter((r) => r.name !== "@everyone");
}
