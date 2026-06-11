export interface DiscordUserResponse {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

interface DiscordApiUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export function buildAvatarUrl(id: string, avatarHash: string | null): string {
  if (avatarHash) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=80`;
  }
  const index = Number(BigInt(id) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function fetchDiscordApiUser(
  userId: string,
  botToken: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch
): Promise<DiscordUserResponse | null> {
  const response = await fetcher(`https://discord.com/api/v10/users/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Discord API returned ${response.status}`);

  const user = (await response.json()) as DiscordApiUser;
  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name,
    avatarUrl: buildAvatarUrl(user.id, user.avatar),
  };
}
