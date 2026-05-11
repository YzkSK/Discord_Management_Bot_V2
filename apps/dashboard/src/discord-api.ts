export interface DiscordOAuthGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

export interface DiscordGuildMember {
  roles: string[];
}

const discordApiBaseUrl = "https://discord.com/api/v10";

export async function fetchCurrentUserGuild(
  accessToken: string,
  guildId: string
) {
  const response = await fetch(`${discordApiBaseUrl}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load Discord guilds (${response.status}).`);
  }

  const guilds = (await response.json()) as DiscordOAuthGuild[];
  return guilds.find((guild) => guild.id === guildId) ?? null;
}

export async function fetchGuildMemberRoleIds(
  botToken: string,
  guildId: string,
  userId: string
) {
  const response = await fetch(
    `${discordApiBaseUrl}/guilds/${guildId}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`
      },
      cache: "no-store"
    }
  );

  if (response.status === 404 || response.status === 403) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to load Discord guild member (${response.status}).`);
  }

  const member = (await response.json()) as DiscordGuildMember;
  return member.roles;
}
