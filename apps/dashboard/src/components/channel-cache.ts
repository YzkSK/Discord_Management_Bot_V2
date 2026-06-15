export interface CachedDiscordChannel {
  id: string;
  name: string;
}

const cache = new Map<string, CachedDiscordChannel>();
const inflight = new Map<string, Promise<CachedDiscordChannel>>();
const MAX_CACHE_SIZE = 500;

export function fetchCachedDiscordChannel(
  channelId: string,
  guildId?: string
): Promise<CachedDiscordChannel> {
  const hit = cache.get(channelId);
  if (hit) return Promise.resolve(hit);

  const existing = inflight.get(channelId);
  if (existing) return existing;

  const url = guildId
    ? `/api/discord/channels/${channelId}?guildId=${encodeURIComponent(guildId)}`
    : `/api/discord/channels/${channelId}`;
<<<<<<< HEAD

  const promise = fetch(url)
    .then(async (response) => {
      if (!response.ok) return { id: channelId, name: channelId };
      return (await response.json()) as CachedDiscordChannel;
    })
    .catch(() => ({ id: channelId, name: channelId }))
    .then((data) => {
      if (cache.size >= MAX_CACHE_SIZE) cache.clear();
      cache.set(channelId, data);
      inflight.delete(channelId);
      return data;
    });

  inflight.set(channelId, promise);
  return promise;
=======
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`[channel-cache] fetch failed for ${channelId}: HTTP ${response.status}`);
    const fallback: CachedDiscordChannel = { id: channelId, name: channelId };
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(channelId, fallback);
    return fallback;
  }

  const data = (await response.json()) as CachedDiscordChannel;
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(channelId, data);
  return data;
>>>>>>> a8dc0179d3feac4d5b9e187d2883be7c47837ecc
}
