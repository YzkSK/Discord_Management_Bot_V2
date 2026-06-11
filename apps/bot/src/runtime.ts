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
import { installGatewayLogHandlers } from "./discord/gateway-logs.js";
import { installGuildRegistrationHandlers } from "./discord/guild-registration.js";
import { installInteractionRouter } from "./discord/interactions.js";
import { installMessageLogHandlers } from "./discord/message-logs.js";
import { installTempVoiceHandlers } from "./discord/temp-voice.js";
import { createDiscordLogWriter } from "./discord/log-writer.js";
import { installTtsMessageReader } from "./discord/tts-message-reader.js";
import { installTtsAutoLeaveHandler } from "./discord/tts-auto-leave.js";
import { TtsSessionManager } from "./discord/tts-session.js";
import { installVoiceActivityHandlers } from "./discord/voice-activity.js";
import { createVoicevoxClient, getVoicevoxSpeakers } from "./discord/voicevox.js";

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
      const ttsSessionManager = new TtsSessionManager();
      const logWriter = createDiscordLogWriter(discordClient, {
        db: dbConnection.db,
        redis: redisConnection.client
      });
      const voicevoxBaseUrl = env.VOICEVOX_URL;
      const voicevox = createVoicevoxClient({
        baseUrl: voicevoxBaseUrl,
        speaker: env.VOICEVOX_SPEAKER_ID
      });
      installDiscordLifecycleLogging(discordClient);
      installGuildRegistrationHandlers(discordClient, { db: dbConnection.db });
      installInteractionRouter(discordClient, {
        db: dbConnection.db,
        logWriter,
        redis: redisConnection.client,
        ttsSessionManager,
        getSpeakers: () => getVoicevoxSpeakers(voicevoxBaseUrl)
      });
      installMessageLogHandlers(discordClient, {
        db: dbConnection.db,
        redis: redisConnection.client
      });
      installGatewayLogHandlers(discordClient, {
        db: dbConnection.db,
        redis: redisConnection.client
      });
      installTempVoiceHandlers(discordClient, {
        db: dbConnection.db,
        redis: redisConnection.client
      });
      installVoiceActivityHandlers(discordClient, {
        db: dbConnection.db,
        logWriter
      });
      installTtsAutoLeaveHandler(discordClient, {
        logWriter,
        ttsSessionManager
      });
      installTtsMessageReader(discordClient, {
        db: dbConnection.db,
        logWriter,
        speakerId: env.VOICEVOX_SPEAKER_ID,
        ttsSessionManager,
        voicevox
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
