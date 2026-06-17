import type { DbClient } from "@discord-bot/db";
import {
  createLogIngestionService,
  resolveRealtimeEnabled
} from "@discord-bot/logger";
import {
  appendLogEventToStream,
  appendRealtimeLogEventToStream,
  type RedisStreamWriter
} from "@discord-bot/logger";
import type { NormalizedEvent } from "@discord-bot/shared";
import type { HandlerError } from "@discord-bot/discord-core";
import type { Client } from "discord.js";

import { sendEventToConfiguredLogChannel } from "./log-channel.js";

export interface DiscordLogWriter {
  write: (event: NormalizedEvent) => Promise<void>;
  recordHandlerError: (error: HandlerError) => Promise<void>;
}

export interface CreateDiscordLogWriterOptions {
  db: DbClient;
  redis: RedisStreamWriter;
}

export function createDiscordLogWriter(
  client: Client,
  options: CreateDiscordLogWriterOptions
): DiscordLogWriter {
  const logIngestion = createLogIngestionService(options.db);

  return {
    async write(event) {
      const realtimeEnabled = resolveRealtimeEnabled(event.eventName);

      await Promise.all([
        logIngestion.ingest(event, { realtimeEnabled }),
        appendLogEventToStream(options.redis, event, { realtimeEnabled }),
        sendEventToConfiguredLogChannel(client, event, options.db).catch(
          (error: unknown) => {
            console.warn("failed to send log event to configured channel", error);
          }
        ),
        realtimeEnabled
          ? appendRealtimeLogEventToStream(options.redis, event, { realtimeEnabled })
          : Promise.resolve()
      ]);
    },

    async recordHandlerError(error) {
      await logIngestion.recordHandlerError(error);
    }
  };
}
