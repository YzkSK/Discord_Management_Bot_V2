import {
  createDbConnection,
  getGuildConfigByGuildId,
  getGuildManagementRoleIds,
  insertLogEvent,
  updateGuildTempVoiceConfigByGuildId,
  updateGuildTtsConfigByGuildId,
  updateGuildConfigByGuildId,
  updateGuildManagementRoleIds,
  updateGuildRecruitmentConfigByGuildId
} from "@discord-bot/db";
import { buildDashboardSettingsFeatures } from "@discord-bot/shared";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { fetchGuildRoles, fetchGuildChannels } from "../../../discord-api";
import { optionalParam } from "../../../lib/request-params";
import {
  parseSettingsPatchBody,
  type SettingsPatchValue
} from "./validation";

export const dynamic = "force-dynamic";

const DISCORD_CHANNEL_TYPES = { TEXT: 0, VOICE: 2, CATEGORY: 4 } as const;

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() { return (_env ??= parseDashboardAuthEnv()); }

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

    const botToken = getEnv().DISCORD_BOT_TOKEN;
    const availableRoles = authorization.guild.owner && botToken
      ? await fetchGuildRoles(botToken, authorization.guild.id).catch(() => [])
      : undefined;

    const channelsData = botToken
      ? await fetchGuildChannels(botToken, authorization.guild.id).catch(() => [])
      : [];

    const availableTextChannels = channelsData
      .filter((ch) => ch.type === DISCORD_CHANNEL_TYPES.TEXT)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    const availableVoiceChannels = channelsData
      .filter((ch) => ch.type === DISCORD_CHANNEL_TYPES.VOICE)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    const availableCategories = channelsData
      .filter((ch) => ch.type === DISCORD_CHANNEL_TYPES.CATEGORY)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    return NextResponse.json({
      ...toSettingsResponse(config),
      accessRole: authorization.role,
      dashboardManagementRoleIds: managementRoleIds,
      ...(availableRoles !== undefined ? { availableRoles } : {}),
      availableTextChannels,
      availableVoiceChannels,
      availableCategories
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

    const now = new Date();
    void insertLogEvent(dbConnection.db, {
      eventName: "config.updated",
      guildId: authorization.guild.id,
      actorId: authorization.userId,
      channelId: null,
      messageId: null,
      eventTimestamp: now,
      receivedAt: now,
      payload: { changes: parsedPatch.value }
    }).catch(() => {/* best-effort */});

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

  if (input.patch.section === "recruitment") {
    return updateGuildRecruitmentConfigByGuildId(db, {
      guildId: input.guildId,
      ...("channelId" in input.patch.values
        ? { recruitmentChannelId: input.patch.values.channelId }
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
