import type { AppEnv } from "@discord-bot/config";
import { parseAppEnv } from "@discord-bot/config";
import type { DbConnection } from "@discord-bot/db";
import { createDbConnection } from "@discord-bot/db";
import { realtimeDefaultDisabledEvents } from "@discord-bot/shared";

export interface BotRuntime {
  start: () => Promise<void>;
  stop: (reason?: string) => Promise<void>;
}

export interface BotRuntimeOptions {
  env?: AppEnv;
  createDb?: (databaseUrl: string) => DbConnection;
}

export function createBotRuntime(options: BotRuntimeOptions = {}): BotRuntime {
  const env = options.env ?? parseAppEnv();
  const createDb = options.createDb ?? createDbConnection;
  let dbConnection: DbConnection | null = null;
  let started = false;

  return {
    async start() {
      if (started) {
        return;
      }

      dbConnection = createDb(env.DATABASE_URL);
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
      await dbConnection?.close();
      dbConnection = null;

      console.log("bot runtime stopped", { reason });
    }
  };
}
