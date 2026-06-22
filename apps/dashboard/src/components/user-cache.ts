import { buildAvatarUrl } from "../lib/discord-user";

export interface CachedDiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

const cache = new Map<string, CachedDiscordUser>();
const inFlight = new Map<string, Promise<CachedDiscordUser>>();
const MAX_CACHE_SIZE = 500;

export function prefetchUsers(userIds: string[]): void {
  const missing = userIds.filter((id) => !cache.has(id) && !inFlight.has(id));
  if (missing.length === 0) return;

  // Single batch request for all missing users.
  const empty: Record<string, CachedDiscordUser> = {};
  const batchPromise: Promise<Record<string, CachedDiscordUser>> = fetch(
    `/api/discord/users?ids=${missing.join(",")}`
  )
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, CachedDiscordUser>>) : empty))
    .catch(() => empty);

  // Register each user in inFlight so fetchCachedDiscordUser reuses this promise
  // instead of firing individual requests while the batch is in flight.
  for (const id of missing) {
    const userPromise = batchPromise.then((data) => {
      const user: CachedDiscordUser = data[id] ?? {
        id,
        username: id,
        globalName: null,
        avatarUrl: buildAvatarUrl(id, null),
      };
      evictIfFull();
      cache.set(id, user);
      inFlight.delete(id);
      return user;
    });
    inFlight.set(id, userPromise);
  }
}

export function fetchCachedDiscordUser(
  userId: string
): Promise<CachedDiscordUser> {
  const hit = cache.get(userId);
  if (hit) return Promise.resolve(hit);

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const promise = fetch(`/api/discord/users/${userId}`)
    .then(async (response) => {
      if (!response.ok) {
        return {
          id: userId,
          username: userId,
          globalName: null,
          avatarUrl: buildAvatarUrl(userId, null),
        } satisfies CachedDiscordUser;
      }
      return response.json() as Promise<CachedDiscordUser>;
    })
    .catch((): CachedDiscordUser => ({
      id: userId,
      username: userId,
      globalName: null,
      avatarUrl: buildAvatarUrl(userId, null),
    }))
    .then((data) => {
      evictIfFull();
      cache.set(userId, data);
      inFlight.delete(userId);
      return data;
    });

  inFlight.set(userId, promise);
  return promise;
}

function evictIfFull() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}
