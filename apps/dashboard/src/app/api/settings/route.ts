import {
  createDbConnection,
  getGuildConfigByGuildId,
  getGuildManagementRoleIds,
  updateGuildTempVoiceConfigByGuildId,
  updateGuildTtsConfigByGuildId,
  updateGuildConfigByGuildId,
  updateGuildManagementRoleIds
} from "@discord-bot/db";
import { buildDashboardSettingsFeatures } from "@discord-bot/shared";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { fetchGuildRoles } from "../../../discord-api";
import {
  parseSettingsPatchBody,
  type SettingsPatchValue
} from "./validation";

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
      ...toSettingsResponse(config),
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
  const rawRoleIds =
    typeof body === "object" && body && "dashboardManagementRoleIds" in body
      ? body.dashboardManagementRoleIds
      : undefined;
  const dashboardManagementRoleIds: string[] | undefined =
    Array.isArray(rawRoleIds) && rawRoleIds.every((v) => typeof v === "string")
      ? rawRoleIds
      : undefined;
  const parsedPatch = parseSettingsPatchBody(body);
  const guildId = readBodyGuildId(body);

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

    if (!parsedPatch.ok) {
      return NextResponse.json({ error: parsedPatch.error }, { status: 400 });
    }

    const updated = await updateSettingsSection(dbConnection.db, {
      guildId: authorization.guild.id,
      patch: parsedPatch.value
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Guild config is not initialized." },
        { status: 404 }
      );
    }

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
      ...toSettingsResponse(config),
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

function readBodyGuildId(body: unknown) {
  return typeof body === "object" &&
    body !== null &&
    "guildId" in body &&
    typeof body.guildId === "string"
    ? body.guildId.trim()
    : "";
}

type SettingsConfig = NonNullable<Awaited<ReturnType<typeof getGuildConfigByGuildId>>>;

function toSettingsResponse(config: SettingsConfig) {
  const features = buildDashboardSettingsFeatures(config);

  return {
    guildId: config.guildId,
    guildName: config.guildName,
    isActive: config.isActive,
    logMode: features.logs.logMode,
    language: features.logs.language,
    updatedAt: config.updatedAt.toISOString(),
    features
  };
}

async function updateSettingsSection(
  db: Parameters<typeof updateGuildConfigByGuildId>[0],
  input: {
    guildId: string;
    patch: SettingsPatchValue;
  }
) {
  if (input.patch.section === "logs") {
    return updateGuildConfigByGuildId(db, {
      guildId: input.guildId,
      ...input.patch.values
    });
  }

  if (input.patch.section === "tempVc") {
    return updateGuildTempVoiceConfigByGuildId(db, {
      guildId: input.guildId,
      ...("createChannelId" in input.patch.values
        ? { tempVoiceCreateChannelId: input.patch.values.createChannelId }
        : {}),
      ...("categoryId" in input.patch.values
        ? { tempVoiceCategoryId: input.patch.values.categoryId }
        : {})
    });
  }

  return updateGuildTtsConfigByGuildId(db, {
    guildId: input.guildId,
    ...("textChannelId" in input.patch.values
      ? { ttsTextChannelId: input.patch.values.textChannelId }
      : {})
  });
}
