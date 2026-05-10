import { parseRedisEnv } from "@discord-bot/config";
import { createClient } from "redis";

export interface RedisClient {
  connect: () => Promise<unknown>;
  quit: () => Promise<unknown>;
  xAdd: (
    key: string,
    id: "*",
    fields: Record<string, string>
  ) => Promise<string | null>;
}

export interface RedisConnection {
  client: RedisClient;
  close: () => Promise<unknown>;
}

export function createRedisClient(
  redisUrl = parseRedisEnv().REDIS_URL
): RedisClient {
  return createClient({
    url: redisUrl
  }) as unknown as RedisClient;
}

export async function createRedisConnection(
  redisUrl = parseRedisEnv().REDIS_URL
): Promise<RedisConnection> {
  const client = createRedisClient(redisUrl);
  await client.connect();

  return {
    client,
    close: () => client.quit()
  };
}
