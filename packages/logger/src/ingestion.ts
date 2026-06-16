import type { DbClient, InsertLogEventInput } from "@discord-bot/db";
import { insertLogEvent } from "@discord-bot/db";
import {
  type NormalizedEvent,
  normalizedEventSchema
} from "@discord-bot/shared";

import { resolveRealtimeEnabled } from "./realtime-policy.js";

export interface IngestLogEventOptions {
  realtimeEnabled?: boolean;
}

export interface LogIngestionService {
  ingest: (
    event: NormalizedEvent,
    options?: IngestLogEventOptions
  ) => ReturnType<typeof insertLogEvent>;
  recordHandlerError: (input: RecordHandlerErrorInput) => ReturnType<typeof insertLogEvent>;
}

export interface RecordHandlerErrorInput {
  event: NormalizedEvent;
  handlerName: string;
  error: unknown;
  receivedAt?: Date;
}

export function createLogIngestionService(db: DbClient): LogIngestionService {
  return {
    ingest(event, options) {
      return insertLogEvent(db, toInsertLogEventInput(event, options));
    },

    recordHandlerError(input) {
      return insertLogEvent(db, toHandlerErrorLogInput(input));
    }
  };
}

export function toInsertLogEventInput(
  event: NormalizedEvent,
  options: IngestLogEventOptions = {}
): InsertLogEventInput {
  const parsedEvent = normalizedEventSchema.parse(event);
  const realtimeOptions =
    typeof options.realtimeEnabled === "boolean"
      ? { override: options.realtimeEnabled }
      : {};

  return {
    eventName: parsedEvent.eventName,
    guildId: parsedEvent.guildId,
    actorId: parsedEvent.actorId,
    channelId: parsedEvent.channelId,
    messageId: parsedEvent.messageId,
    eventTimestamp: parsedEvent.eventTimestamp,
    receivedAt: parsedEvent.receivedAt,
    realtimeEnabled: resolveRealtimeEnabled(parsedEvent.eventName, realtimeOptions),
    payload: parsedEvent.payload
  };
}

export function toHandlerErrorLogInput(
  input: RecordHandlerErrorInput
): InsertLogEventInput {
  const parsedEvent = normalizedEventSchema.parse(input.event);
  const error = normalizeError(input.error);

  return {
    eventName: "system.handler.error",
    guildId: parsedEvent.guildId,
    actorId: parsedEvent.actorId,
    channelId: parsedEvent.channelId,
    messageId: parsedEvent.messageId,
    eventTimestamp: parsedEvent.eventTimestamp,
    receivedAt: input.receivedAt ?? new Date(),
    realtimeEnabled: resolveRealtimeEnabled("system.handler.error"),
    payload: {
      handlerName: input.handlerName,
      sourceEventName: parsedEvent.eventName,
      error
    }
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    name: "UnknownError",
    message: String(error)
  };
}
