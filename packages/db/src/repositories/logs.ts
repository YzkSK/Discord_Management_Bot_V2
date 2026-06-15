import type { DbClient } from "../client.js";
import { and, desc, eq, getTableColumns, ilike, like, lte, or, sql, type SQL } from "drizzle-orm";
import { discordChannels, logs } from "../schema/index.js";
import { clampLimit } from "./pagination.js";

export interface InsertLogEventInput {
  eventName: string;
  guildId?: string | null;
  actorId?: string | null;
  channelId?: string | null;
  messageId?: string | null;
  eventTimestamp?: Date;
  receivedAt?: Date;
  realtimeEnabled?: boolean;
  payload?: Record<string, unknown>;
}

export interface ListLogEventsInput {
  guildId?: string;
  eventName?: string;
  actorId?: string;
  channelId?: string;
  messageId?: string;
  search?: string;
  before?: Date;
  limit?: number;
}

export interface ListLogEventsResult {
  items: Awaited<ReturnType<typeof listLogEventsQuery>>;
  nextCursor: string | null;
}

export async function insertLogEvent(
  db: DbClient,
  input: InsertLogEventInput
) {
  const [log] = await db
    .insert(logs)
    .values({
      eventName: input.eventName,
      guildId: input.guildId ?? null,
      actorId: input.actorId ?? null,
      channelId: input.channelId ?? null,
      messageId: input.messageId ?? null,
      eventTimestamp: input.eventTimestamp ?? new Date(),
      receivedAt: input.receivedAt ?? new Date(),
      realtimeEnabled: input.realtimeEnabled ?? false,
      payload: input.payload ?? {}
    })
    .returning();

  if (!log) {
    throw new Error("Failed to insert log event.");
  }

  return log;
}

export async function listLogEvents(
  db: DbClient,
  input: ListLogEventsInput = {}
): Promise<ListLogEventsResult> {
  const limit = clampLimit(input.limit, DEFAULT_LOGS_LIMIT, MAX_LOGS_LIMIT);
  const items = await listLogEventsQuery(db, input, limit + 1);
  const hasMore = items.length > limit;
  const visibleItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = visibleItems.at(-1);

  return {
    items: visibleItems,
    nextCursor: hasMore && lastItem ? lastItem.receivedAt.toISOString() : null
  };
}

export async function recordSystemBotStarted(
  db: DbClient,
  payload: Record<string, unknown>
) {
  return insertLogEvent(db, {
    eventName: "system.bot.started",
    guildId: null,
    actorId: null,
    channelId: null,
    messageId: null,
    realtimeEnabled: false,
    payload
  });
}

function listLogEventsQuery(
  db: DbClient,
  input: ListLogEventsInput,
  limit: number
) {
  const filters = buildLogFilters(input);

  return db
    .select({
      ...getTableColumns(logs),
      channelName: discordChannels.name
    })
    .from(logs)
    .leftJoin(discordChannels, eq(logs.channelId, discordChannels.channelId))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(logs.receivedAt))
    .limit(limit);
}

function buildLogFilters(input: ListLogEventsInput): SQL[] {
  const filters: SQL[] = [];

  if (input.guildId) {
    filters.push(eq(logs.guildId, input.guildId));
  }

  if (input.eventName) {
    filters.push(like(logs.eventName, `${input.eventName}.%`));
  }

  if (input.actorId) {
    filters.push(eq(logs.actorId, input.actorId));
  }

  if (input.channelId) {
    filters.push(eq(logs.channelId, input.channelId));
  }

  if (input.messageId) {
    filters.push(eq(logs.messageId, input.messageId));
  }

  if (input.search) {
    filters.push(
      or(
        ilike(logs.eventName, `%${input.search}%`),
        ilike(sql`${logs.payload}::text`, `%${input.search}%`)
      )!
    );
  }

  if (input.before) {
    filters.push(lte(logs.receivedAt, input.before));
  }

  return filters;
}

const DEFAULT_LOGS_LIMIT = 50;
const MAX_LOGS_LIMIT = 100;
