import {
  type NormalizedEvent,
  normalizedEventSchema
} from "@discord-bot/shared";

import type { RedisClient } from "./client.js";

export const LOGS_STREAM_KEY = "logs:events";
export const REALTIME_LOGS_STREAM_PREFIX = "rt:logs:";

export interface AppendLogEventOptions {
  realtimeEnabled?: boolean;
}

export interface LogStreamFields extends Record<string, string> {
  event_name: string;
  guild_id: string;
  actor_id: string;
  channel_id: string;
  message_id: string;
  event_timestamp: string;
  received_at: string;
  realtime_enabled: string;
  payload: string;
}

export interface RedisStreamWriter {
  xAdd: (
    key: string,
    id: "*",
    fields: Record<string, string>
  ) => Promise<string | null>;
}

export async function appendLogEventToStream(
  redis: RedisStreamWriter,
  event: NormalizedEvent,
  options: AppendLogEventOptions = {}
) {
  return redis.xAdd(LOGS_STREAM_KEY, "*", toLogStreamFields(event, options));
}

export async function appendRealtimeLogEventToStream(
  redis: RedisStreamWriter,
  event: NormalizedEvent,
  options: AppendLogEventOptions = {}
) {
  const parsedEvent = normalizedEventSchema.parse(event);

  if (!parsedEvent.guildId) {
    return null;
  }

  return redis.xAdd(
    `${REALTIME_LOGS_STREAM_PREFIX}${parsedEvent.guildId}`,
    "*",
    toLogStreamFields(parsedEvent, options)
  );
}

export function toLogStreamFields(
  event: NormalizedEvent,
  options: AppendLogEventOptions = {}
): LogStreamFields {
  const parsedEvent = normalizedEventSchema.parse(event);

  return {
    event_name: parsedEvent.eventName,
    guild_id: parsedEvent.guildId ?? "",
    actor_id: parsedEvent.actorId ?? "",
    channel_id: parsedEvent.channelId ?? "",
    message_id: parsedEvent.messageId ?? "",
    event_timestamp: parsedEvent.eventTimestamp.toISOString(),
    received_at: parsedEvent.receivedAt.toISOString(),
    realtime_enabled: options.realtimeEnabled === true ? "1" : "0",
    payload: JSON.stringify(parsedEvent.payload)
  };
}

export function asRedisStreamWriter(redis: RedisClient): RedisStreamWriter {
  return {
    xAdd(key, id, fields) {
      return redis.xAdd(key, id, fields);
    }
  };
}
