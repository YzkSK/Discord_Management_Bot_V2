export interface CachedDiscordChannel {
  id: string;
  name: string;
}

const cache = new Map<string, CachedDiscordChannel>();
const MAX_CACHE_SIZE = 500;

export async function fetchCachedDiscordChannel(
  channelId: string
): Promise<CachedDiscordChannel> {
  const hit = cache.get(channelId);
  if (hit) return hit;

  const response = await fetch(`/api/discord/channels/${channelId}`);
  if (!response.ok) {
    const fallback: CachedDiscordChannel = { id: channelId, name: channelId };
    if (cache.size >= MAX_CACHE_SIZE) cache.clear();
    cache.set(channelId, fallback);
    return fallback;
  }

  const data = (await response.json()) as CachedDiscordChannel;
  if (cache.size >= MAX_CACHE_SIZE) cache.clear();
  cache.set(channelId, data);
  return data;
}
