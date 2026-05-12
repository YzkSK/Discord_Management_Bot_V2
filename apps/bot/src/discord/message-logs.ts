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
import {
  Events,
  type Client,
  type Message,
  type PartialMessage
} from "discord.js";

import { sendEventToConfiguredLogChannel } from "./log-channel.js";

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
          return writeMessageLogEvent(
            event,
            options.redis,
            logIngestion,
            client
          );
        }
      }
    ],
    async onHandlerError(error) {
      await logIngestion.recordHandlerError(error);
    }
  });

  client.on(Events.MessageCreate, (message) => {
    if (shouldSkipMessageLog(message)) {
      return;
    }

    dispatcher.dispatch(normalizeMessageCreate(message));
  });

  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    if (shouldSkipMessageLog(newMessage)) {
      return;
    }

    dispatcher.dispatch(normalizeMessageUpdate(oldMessage, newMessage));
  });

  client.on(Events.MessageDelete, (message) => {
    if (shouldSkipMessageLog(message)) {
      return;
    }

    dispatcher.dispatch(normalizeMessageDelete(message));
  });
}

export function shouldSkipMessageLog(message: Message | PartialMessage) {
  return message.author?.bot === true;
}

async function writeMessageLogEvent(
  event: NormalizedEvent,
  redis: RedisStreamWriter,
  logIngestion: ReturnType<typeof createLogIngestionService>,
  client: Client
) {
  const realtimeEnabled = resolveRealtimeEnabled(event.eventName);

  await logIngestion.ingest(event, { realtimeEnabled });
  await appendLogEventToStream(redis, event, { realtimeEnabled });
  await sendEventToConfiguredLogChannel(client, event).catch((error: unknown) => {
    console.warn("failed to send log event to configured channel", error);
  });

  if (realtimeEnabled) {
    await appendRealtimeLogEventToStream(redis, event, { realtimeEnabled });
  }
}
