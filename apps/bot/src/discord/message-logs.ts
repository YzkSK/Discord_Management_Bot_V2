import {
  createEventDispatcher,
  normalizeMessageCreate,
  normalizeMessageDelete,
  normalizeMessageUpdate
} from "@discord-bot/discord-core";
import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/redis";
import {
  Events,
  type Client,
  type Message,
  type PartialMessage
} from "discord.js";

import { createDiscordLogWriter } from "./log-writer.js";

export interface InstallMessageLogHandlersOptions {
  db: DbClient;
  redis: RedisStreamWriter;
}

export function installMessageLogHandlers(
  client: Client,
  options: InstallMessageLogHandlersOptions
) {
  const logWriter = createDiscordLogWriter(client, options);
  const dispatcher = createEventDispatcher({
    handlers: [
      {
        name: "message-log-writer",
        handle(event) {
          return logWriter.write(event);
        }
      }
    ],
    async onHandlerError(error) {
      await logWriter.recordHandlerError(error);
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
