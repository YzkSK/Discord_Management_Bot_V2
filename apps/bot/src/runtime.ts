import type { AppEnv } from "@discord-bot/config";
import { parseAppEnv } from "@discord-bot/config";
import type { DbConnection } from "@discord-bot/db";
import { createDbConnection, recordSystemBotStarted } from "@discord-bot/db";
import type { RedisConnection } from "@discord-bot/redis";
import { createRedisConnection } from "@discord-bot/redis";
import { realtimeDefaultDisabledEvents } from "@discord-bot/shared";
import type { Client } from "discord.js";

import {
  createDiscordClient,
  installDiscordLifecycleLogging
} from "./discord/client.js";
import { installInteractionRouter } from "./discord/interactions.js";
import { installMessageLogHandlers } from "./discord/message-logs.js";

export interface BotRuntime {
  start: () => Promise<void>;
  stop: (reason?: string) => Promise<void>;
}

export interface BotRuntimeOptions {
  env?: AppEnv;
  createDb?: (databaseUrl: string) => DbConnection;
  createRedis?: (redisUrl: string) => Promise<RedisConnection>;
  createDiscord?: () => Client;
}

export function createBotRuntime(options: BotRuntimeOptions = {}): BotRuntime {
  const env = options.env ?? parseAppEnv();
  const createDb = options.createDb ?? createDbConnection;
  const createRedis = options.createRedis ?? createRedisConnection;
  const createDiscord = options.createDiscord ?? createDiscordClient;
  let dbConnection: DbConnection | null = null;
  let redisConnection: RedisConnection | null = null;
  let discordClient: Client | null = null;
  let started = false;

  return {
    async start() {
      if (started) {
        return;
      }

      dbConnection = createDb(env.DATABASE_URL);
      redisConnection = await createRedis(env.REDIS_URL);
      discordClient = createDiscord();
      installDiscordLifecycleLogging(discordClient);
      installInteractionRouter(discordClient, { db: dbConnection.db });
      installMessageLogHandlers(discordClient, {
        db: dbConnection.db,
        redis: redisConnection.client
      });
      await discordClient.login(env.DISCORD_BOT_TOKEN);
      await recordStartupLog(dbConnection, env).catch((error: unknown) => {
        console.error("failed to record bot startup log", error);
      });
      started = true;

      console.log("bot runtime started", {
        dashboardUrl: env.PUBLIC_DASHBOARD_URL,
        logLevel: env.LOG_LEVEL,
        realtimeDisabledEventCount: realtimeDefaultDisabledEvents.length
      });
    },

    async stop(reason = "shutdown") {
      if (!started) {
        return;
      }

      started = false;
      discordClient?.destroy();
      discordClient = null;
      await redisConnection?.close();
      redisConnection = null;
      await dbConnection?.close();
      dbConnection = null;

      console.log("bot runtime stopped", { reason });
    }
  };
}

async function recordStartupLog(dbConnection: DbConnection, env: AppEnv) {
  await recordSystemBotStarted(dbConnection.db, {
    dashboardUrl: env.PUBLIC_DASHBOARD_URL,
    logLevel: env.LOG_LEVEL,
    nodeVersion: process.version,
    startedAt: new Date().toISOString()
  });
}
