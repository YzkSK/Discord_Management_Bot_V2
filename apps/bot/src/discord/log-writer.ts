import type { DbClient } from "@discord-bot/db";
import {
  createLogIngestionService,
  resolveRealtimeEnabled
} from "@discord-bot/logger";
import {
  appendLogEventToStream,
  appendRealtimeLogEventToStream,
  type RedisStreamWriter
} from "@discord-bot/redis";
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

      await logIngestion.ingest(event, { realtimeEnabled });
      await appendLogEventToStream(options.redis, event, { realtimeEnabled });
      await sendEventToConfiguredLogChannel(client, event).catch(
        (error: unknown) => {
          console.warn("failed to send log event to configured channel", error);
        }
      );

      if (realtimeEnabled) {
        await appendRealtimeLogEventToStream(options.redis, event, {
          realtimeEnabled
        });
      }
    },

    async recordHandlerError(error) {
      await logIngestion.recordHandlerError(error);
    }
  };
}
