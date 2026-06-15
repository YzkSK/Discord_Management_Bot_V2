import { buildAvatarUrl } from "../lib/discord-user";

export interface CachedDiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

const cache = new Map<string, CachedDiscordUser>();
const MAX_CACHE_SIZE = 500;

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
      avatarUrl: buildAvatarUrl(userId, null),
    };
    if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
    cache.set(userId, fallback);
    return fallback;
  }

  const data = (await response.json()) as CachedDiscordUser;
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(userId, data);
  return data;
}
