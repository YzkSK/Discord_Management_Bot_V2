import {
  createEventDispatcher,
  normalizeMessageCreate,
  normalizeMessageDelete,
  normalizeMessageUpdate
} from "@discord-bot/discord-core";
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
import { Events, type Client } from "discord.js";

export interface InstallMessageLogHandlersOptions {
  db: DbClient;
  redis: RedisStreamWriter;
}

export function installMessageLogHandlers(
  client: Client,
  options: InstallMessageLogHandlersOptions
) {
  const logIngestion = createLogIngestionService(options.db);
  const dispatcher = createEventDispatcher({
    handlers: [
      {
        name: "message-log-writer",
        handle(event) {
          return writeMessageLogEvent(event, options.redis, logIngestion);
        }
      }
    ],
    async onHandlerError(error) {
      await logIngestion.recordHandlerError(error);
    }
  });

  client.on(Events.MessageCreate, (message) => {
    dispatcher.dispatch(normalizeMessageCreate(message));
  });

  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    dispatcher.dispatch(normalizeMessageUpdate(oldMessage, newMessage));
  });

  client.on(Events.MessageDelete, (message) => {
    dispatcher.dispatch(normalizeMessageDelete(message));
  });
}

async function writeMessageLogEvent(
  event: NormalizedEvent,
  redis: RedisStreamWriter,
  logIngestion: ReturnType<typeof createLogIngestionService>
) {
  const realtimeEnabled = resolveRealtimeEnabled(event.eventName);

  await logIngestion.ingest(event, { realtimeEnabled });
  await appendLogEventToStream(redis, event, { realtimeEnabled });

  if (realtimeEnabled) {
    await appendRealtimeLogEventToStream(redis, event, { realtimeEnabled });
  }
}
