import {
  createDbConnection,
  deleteTtsDictionaryEntry,
  ensureTtsDictionaryEntry,
  listGuildTtsDictionaryEntries
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../../dashboard-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get("guildId")?.trim() || undefined;
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
    const allEntries = await listGuildTtsDictionaryEntries(dbConnection.db, {
      guildId: authorization.guild.id
    });

    const userEntries = allEntries.filter(
      (e) => e.scope === "user" && e.userId === authorization.userId
    );

    return NextResponse.json({
      guildId: authorization.guild.id,
      userId: authorization.userId,
      entries: userEntries
    });
  } finally {
    await dbConnection.close();
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guildId = readBodyString(body, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId: guildId || undefined,
    requiredRole: "viewer"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const fromText = readBodyString(body, "fromText");
  const toText = readBodyString(body, "toText");
  if (!fromText) {
    return NextResponse.json({ error: "fromText is required." }, { status: 400 });
  }
  if (!toText) {
    return NextResponse.json({ error: "toText is required." }, { status: 400 });
  }

  const priority =
    typeof body?.priority === "number" && Number.isInteger(body.priority) && body.priority >= 0
      ? body.priority
      : 0;

  const isEnabled = typeof body?.isEnabled === "boolean" ? body.isEnabled : true;

  const dbConnection = createDbConnection();
  try {
    const entry = await ensureTtsDictionaryEntry(dbConnection.db, {
      guildId: authorization.guild.id,
      scope: "user",
      userId: authorization.userId,
      fromText,
      toText,
      priority,
      isEnabled
    });

    return NextResponse.json({ entry });
  } finally {
    await dbConnection.close();
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guildId = readBodyString(body, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId: guildId || undefined,
    requiredRole: "viewer"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const fromText = readBodyString(body, "fromText");
  if (!fromText) {
    return NextResponse.json({ error: "fromText is required." }, { status: 400 });
  }

  const dbConnection = createDbConnection();
  try {
    const entry = await deleteTtsDictionaryEntry(dbConnection.db, {
      guildId: authorization.guild.id,
      scope: "user",
      userId: authorization.userId,
      fromText
    });

    return NextResponse.json({ entry });
  } finally {
    await dbConnection.close();
  }
}

function readBodyString(body: unknown, key: string) {
  if (
    typeof body === "object" &&
    body !== null &&
    key in body &&
    typeof (body as Record<string, unknown>)[key] === "string"
  ) {
    return ((body as Record<string, unknown>)[key] as string).trim();
  }
  return "";
}
