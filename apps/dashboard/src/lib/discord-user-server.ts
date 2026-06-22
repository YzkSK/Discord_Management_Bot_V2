import { fetchDiscordApiUser, buildAvatarUrl, type DiscordUserResponse } from "./discord-user";

type CacheEntry = { data: DiscordUserResponse; expiresAt: number };
const serverCache = new Map<string, CacheEntry>();
const serverInFlight = new Map<string, Promise<DiscordUserResponse | null>>();
const SERVER_TTL_MS = 5 * 60 * 1000;

const DISCORD_CALL_INTERVAL_MS = 100;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let discordQueue = Promise.resolve();

function enqueueDiscordCall<T>(fn: () => Promise<T>): Promise<T> {
  const result = discordQueue.then(fn);
  discordQueue = result.then(
    () => sleep(DISCORD_CALL_INTERVAL_MS),
    () => sleep(DISCORD_CALL_INTERVAL_MS),
  );
  return result;
}

export function getCachedUser(userId: string): DiscordUserResponse | null {
  const entry = serverCache.get(userId);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

export function fetchUser(userId: string, botToken: string): Promise<DiscordUserResponse | null> {
  const cached = serverCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);

  let promise = serverInFlight.get(userId);
  if (promise) return promise;

  promise = enqueueDiscordCall(() => fetchDiscordApiUser(userId, botToken)).then((user) => {
    if (user) serverCache.set(userId, { data: user, expiresAt: Date.now() + SERVER_TTL_MS });
    return user;
  }).finally(() => {
    serverInFlight.delete(userId);
  });

  serverInFlight.set(userId, promise);
  return promise;
}

export function fallbackUser(userId: string): DiscordUserResponse {
  return { id: userId, username: "Unknown User", globalName: null, avatarUrl: buildAvatarUrl(userId, null) };
}
