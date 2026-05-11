import {
  createDbConnection,
  getGuildConfigByGuildId,
  isGuildLogMode,
  updateGuildConfigByGuildId
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guildId = optionalParam(request.nextUrl.searchParams, "guildId");
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
    const config = await getGuildConfigByGuildId(
      dbConnection.db,
      authorization.guild.id
    );

    if (!config) {
      return NextResponse.json(
        { error: "Guild config is not initialized." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      guildId: config.guildId,
      guildName: config.guildName,
      isActive: config.isActive,
      logMode: config.logMode,
      updatedAt: config.updatedAt.toISOString(),
      accessRole: authorization.role
    });
  } finally {
    await dbConnection.close();
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guildId =
    typeof body === "object" && body && "guildId" in body
      ? String(body.guildId).trim()
      : "";
  const logMode =
    typeof body === "object" && body && "logMode" in body
      ? String(body.logMode).trim()
      : "";

  const authorization = await authorizeDashboardApi({
    request,
    guildId: guildId || undefined,
    requiredRole: "admin"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  if (!isGuildLogMode(logMode)) {
    return NextResponse.json({ error: "Invalid logMode." }, { status: 400 });
  }

  const dbConnection = createDbConnection();

  try {
    const config = await updateGuildConfigByGuildId(dbConnection.db, {
      guildId: authorization.guild.id,
      logMode
    });

    if (!config) {
      return NextResponse.json(
        { error: "Guild config is not initialized." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      guildId: authorization.guild.id,
      logMode: config.logMode,
      updatedAt: config.updatedAt.toISOString(),
      accessRole: authorization.role
    });
  } finally {
    await dbConnection.close();
  }
}

function optionalParam(query: URLSearchParams, key: string) {
  const value = query.get(key)?.trim();
  return value ? value : undefined;
}
