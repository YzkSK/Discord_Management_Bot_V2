import {
  createEventDispatcher,
  normalizeMessageCreate,
  normalizeMessageDelete,
  normalizeMessageUpdate
} from "@discord-bot/discord-core";
import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/logger";
import {
  AuditLogEvent,
  Events,
  type Client,
  type Message,
  type PartialMessage
} from "discord.js";

import { writeWithAuditLog } from "./audit-log.js";
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

    // embed unfurl: Discord fires MessageUpdate when an embed preview is attached
    // without changing the text. Skip if the content is identical.
    if (oldMessage.content !== null && oldMessage.content === newMessage.content) {
      return;
    }

    dispatcher.dispatch(normalizeMessageUpdate(oldMessage, newMessage));
  });

  client.on(Events.MessageDelete, (message) => {
    if (shouldSkipMessageLog(message)) {
      return;
    }

    writeWithAuditLog(
      (event) => dispatcher.dispatch(event),
      normalizeMessageDelete(message),
      message.guild,
      AuditLogEvent.MessageDelete,
      message.author?.id ?? null
    );
  });
}

export function shouldSkipMessageLog(message: Message | PartialMessage) {
  return message.author?.bot === true;
}
