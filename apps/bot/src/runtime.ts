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
import { installTtsAnnounceHandler } from "./discord/tts-announce.js";
import { TtsSessionManager } from "./discord/tts-session.js";
import { LocalTtsPlaybackQueue } from "./discord/tts-queue.js";
import { installVoiceActivityHandlers } from "./discord/voice-activity.js";
import { installChannelNameHandlers } from "./discord/channel-names.js";
import { installMemberAutoGrantHandlers } from "./discord/member-auto-grant.js";
import { installVoiceReconciliation } from "./discord/voice-reconciliation.js";
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

interface RuntimeDeps {
  db: DbConnection;
  discordClient: Client;
  env: AppEnv;
  redis: RedisConnection;
  ttsPlaybackQueue: LocalTtsPlaybackQueue;
  ttsSessionManager: TtsSessionManager;
  voicevox: ReturnType<typeof createVoicevoxClient>;
  voicevoxBaseUrl: string;
  logWriter: ReturnType<typeof createDiscordLogWriter>;
}

async function buildDeps(
  env: AppEnv,
  options: Required<Omit<BotRuntimeOptions, "env">>
): Promise<RuntimeDeps> {
  const db = options.createDb(env.DATABASE_URL);
  const redis = await options.createRedis(env.REDIS_URL);
  const discordClient = options.createDiscord();
  const ttsSessionManager = new TtsSessionManager();
  const ttsPlaybackQueue = new LocalTtsPlaybackQueue();
  const logWriter = createDiscordLogWriter(discordClient, {
    db: db.db,
    redis: redis.client
  });
  const voicevoxBaseUrl = env.VOICEVOX_URL;
  const voicevox = createVoicevoxClient({
    baseUrl: voicevoxBaseUrl,
    speaker: env.VOICEVOX_SPEAKER_ID
  });
  return { db, discordClient, env, redis, ttsPlaybackQueue, ttsSessionManager, voicevox, voicevoxBaseUrl, logWriter };
}

function installHandlers(deps: RuntimeDeps) {
  const { db, discordClient, env, redis, ttsPlaybackQueue, ttsSessionManager, voicevox, voicevoxBaseUrl, logWriter } = deps;

  installDiscordLifecycleLogging(discordClient);
  installGuildRegistrationHandlers(discordClient, { db: db.db });
  installInteractionRouter(discordClient, {
    db: db.db,
    logWriter,
    redis: redis.client,
    ttsSessionManager,
    getSpeakers: () => getVoicevoxSpeakers(voicevoxBaseUrl)
  });
  installMessageLogHandlers(discordClient, { db: db.db, redis: redis.client });
  installGatewayLogHandlers(discordClient, { db: db.db, redis: redis.client });
  installTempVoiceHandlers(discordClient, { db: db.db, redis: redis.client });
  installVoiceActivityHandlers(discordClient, { db: db.db, logWriter });
  installVoiceReconciliation(discordClient, db.db);
  installTtsAutoLeaveHandler(discordClient, { logWriter, ttsSessionManager });
  installTtsAnnounceHandler(discordClient, {
    db: db.db,
    fallbackSpeakerId: env.VOICEVOX_SPEAKER_ID,
    ttsQueue: ttsPlaybackQueue,
    ttsSessionManager,
    voicevox
  });

  installTtsMessageReader(discordClient, {
    db: db.db,
    logWriter,
    speakerId: env.VOICEVOX_SPEAKER_ID,
    ttsQueue: ttsPlaybackQueue,
    ttsSessionManager,
    voicevox
  });
  installChannelNameHandlers(discordClient, db.db);
  installMemberAutoGrantHandlers(discordClient, db.db);
}

export function createBotRuntime(options: BotRuntimeOptions = {}): BotRuntime {
  const env = options.env ?? parseAppEnv();
  const resolvedOptions = {
    createDb: options.createDb ?? createDbConnection,
    createRedis: options.createRedis ?? createRedisConnection,
    createDiscord: options.createDiscord ?? createDiscordClient,
  };
  let deps: RuntimeDeps | null = null;
  let started = false;

  return {
    async start() {
      if (started) {
        return;
      }

      deps = await buildDeps(env, resolvedOptions);
      installHandlers(deps);
      await deps.discordClient.login(env.DISCORD_BOT_TOKEN);
      await recordStartupLog(deps.db, env).catch((error: unknown) => {
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
      deps?.discordClient.destroy();
      await deps?.redis.close().catch((error: unknown) => {
        console.error("failed to close redis connection", error);
      });
      await deps?.db.close().catch((error: unknown) => {
        console.error("failed to close db connection", error);
      });
      deps = null;

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
