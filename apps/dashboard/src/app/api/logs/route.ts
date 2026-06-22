import {
  createDbConnection,
  listLogEvents,
  type ListLogEventsInput
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeDashboardApi } from "../../../dashboard-auth";
import { optionalParam } from "../../../lib/request-params";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const guildId = optionalParam(query, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId,
    requiredRole: "viewer"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();

  try {
    const result = await listLogEvents(dbConnection.db, toListLogEventsInput(query));

    return NextResponse.json({
      accessRole: authorization.role,
      items: result.items.map(toLogResponseItem),
      nextCursor: result.nextCursor
    });
  } finally {
    await dbConnection.close();
  }
}

function toListLogEventsInput(query: URLSearchParams): ListLogEventsInput {
  const input: ListLogEventsInput = {};
  setStringFilter(input, "guildId", optionalParam(query, "guildId"));
  setStringFilter(input, "eventName", optionalParam(query, "eventName"));
  setStringFilter(input, "actorId", optionalParam(query, "actorId"));
  setStringFilter(input, "channelId", optionalParam(query, "channelId"));
  setStringFilter(input, "messageId", optionalParam(query, "messageId"));
  setStringFilter(input, "search", optionalParam(query, "search"));

  const before = optionalDateParam(query, "before");
  if (before) {
    input.before = before;
  }

  const limit = optionalNumberParam(query, "limit");
  if (typeof limit === "number") {
    input.limit = limit;
  }

  return input;
}

function setStringFilter(
  input: ListLogEventsInput,
  key: keyof Pick<
    ListLogEventsInput,
    "guildId" | "eventName" | "actorId" | "channelId" | "messageId" | "search"
  >,
  value: string | undefined
) {
  if (value) {
    input[key] = value;
  }
}


function optionalDateParam(query: URLSearchParams, key: string) {
  const value = optionalParam(query, key);

  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function optionalNumberParam(query: URLSearchParams, key: string) {
  const value = optionalParam(query, key);

  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toLogResponseItem(log: Awaited<ReturnType<typeof listLogEvents>>["items"][number]) {
  return {
    id: log.id,
    eventName: log.eventName,
    guildId: log.guildId,
    actorId: log.actorId,
    channelId: log.channelId,
    channelName: log.channelName ?? null,
    messageId: log.messageId,
    eventTimestamp: log.eventTimestamp.toISOString(),
    receivedAt: log.receivedAt.toISOString(),
    realtimeEnabled: log.realtimeEnabled,
    payload: log.payload
  };
}
