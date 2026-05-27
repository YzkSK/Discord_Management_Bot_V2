import {
  createDbConnection,
  getGuildConfigByGuildId,
  getGuildManagementRoleIds,
  isGuildLogMode,
  updateGuildConfigByGuildId,
  updateGuildManagementRoleIds
} from "@discord-bot/db";
import { isGuildLanguage } from "@discord-bot/shared";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { fetchGuildRoles } from "../../../discord-api";

export const dynamic = "force-dynamic";

const env = parseDashboardAuthEnv();

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

    const managementRoleIds = await getGuildManagementRoleIds(
      dbConnection.db,
      authorization.guild.id
    );

    const availableRoles = authorization.guild.owner && env.DISCORD_BOT_TOKEN
      ? await fetchGuildRoles(env.DISCORD_BOT_TOKEN, authorization.guild.id).catch(() => [])
      : undefined;

    return NextResponse.json({
      guildId: config.guildId,
      guildName: config.guildName,
      isActive: config.isActive,
      logMode: config.logMode,
      language: config.language,
      updatedAt: config.updatedAt.toISOString(),
      accessRole: authorization.role,
      dashboardManagementRoleIds: managementRoleIds,
      ...(availableRoles !== undefined ? { availableRoles } : {})
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
  const languageRaw =
    typeof body === "object" && body && "language" in body
      ? String(body.language).trim()
      : null;
  const rawRoleIds =
    typeof body === "object" && body && "dashboardManagementRoleIds" in body
      ? body.dashboardManagementRoleIds
      : undefined;
  const dashboardManagementRoleIds: string[] | undefined =
    Array.isArray(rawRoleIds) && rawRoleIds.every((v) => typeof v === "string")
      ? rawRoleIds
      : undefined;

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

  const dbConnection = createDbConnection();

  try {
    if (dashboardManagementRoleIds !== undefined) {
      if (!authorization.guild.owner) {
        return NextResponse.json(
          { error: "Only the guild owner can update management roles." },
          { status: 403 }
        );
      }
      await updateGuildManagementRoleIds(
        dbConnection.db,
        authorization.guild.id,
        dashboardManagementRoleIds
      );
      return NextResponse.json({ dashboardManagementRoleIds });
    }

    if (!isGuildLogMode(logMode)) {
      return NextResponse.json({ error: "Invalid logMode." }, { status: 400 });
    }

    if (languageRaw !== null && !isGuildLanguage(languageRaw)) {
      return NextResponse.json({ error: "Invalid language." }, { status: 400 });
    }

    const config = await updateGuildConfigByGuildId(dbConnection.db, {
      guildId: authorization.guild.id,
      logMode,
      ...(languageRaw !== null ? { language: languageRaw } : {})
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
      language: config.language,
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
