export interface CachedDiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

const cache = new Map<string, CachedDiscordUser>();

function defaultAvatarUrl(userId: string): string {
  const index = Number(BigInt(userId) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function fetchCachedDiscordUser(
  userId: string
): Promise<CachedDiscordUser> {
  const hit = cache.get(userId);
  if (hit) return hit;

  const response = await fetch(`/api/discord/users/${userId}`);
  if (!response.ok) {
    const fallback: CachedDiscordUser = {
      id: userId,
      username: userId,
      globalName: null,
      avatarUrl: defaultAvatarUrl(userId),
    };
    cache.set(userId, fallback);
    return fallback;
  }

  const data = (await response.json()) as CachedDiscordUser;
  cache.set(userId, data);
  return data;
}
