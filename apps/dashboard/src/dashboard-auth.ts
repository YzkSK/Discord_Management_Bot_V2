import { parseDashboardAuthEnv } from "@discord-bot/config";
import { createDbConnection } from "@discord-bot/db";
import type { DashboardAccessRole } from "@discord-bot/shared";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { resolveDashboardAccess } from "./authorization";
import { authOptions, getDashboardSession } from "./auth";
import {
  fetchCurrentUserGuild,
  fetchGuildMemberRoleIds
} from "./discord-api";

const env = parseDashboardAuthEnv();

export interface DashboardApiAuthorizationInput {
  request: NextRequest;
  guildId: string | undefined;
  requiredRole?: DashboardAccessRole;
}

export async function requireDashboardPageSession() {
  const session = await getDashboardSession();

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

export async function authorizeDashboardApi(
  input: DashboardApiAuthorizationInput
) {
  if (!input.guildId) {
    return {
      allowed: false,
      status: 400,
      error: "guildId is required."
    } as const;
  }

  const token = await getToken({
    req: input.request,
    ...(authOptions.secret ? { secret: authOptions.secret } : {})
  });

  if (!token?.sub || !token.discordAccessToken) {
    return {
      allowed: false,
      status: 401,
      error: "Authentication required."
    } as const;
  }

  const discordGuild = await fetchCurrentUserGuild(
    token.discordAccessToken,
    input.guildId
  );

  if (!discordGuild) {
    return {
      allowed: false,
      status: 403,
      error: "Guild access denied."
    } as const;
  }

  const roleIds = discordGuild.owner
    ? []
    : await fetchAuthorizedMemberRoleIds(input.guildId, token.sub);
  const dbConnection = createDbConnection();

  try {
    const accessInput = {
      db: dbConnection.db,
      guildId: input.guildId,
      userId: token.sub,
      isGuildOwner: discordGuild.owner,
      roleIds,
      ...(input.requiredRole ? { requiredRole: input.requiredRole } : {})
    };
    const access = await resolveDashboardAccess(accessInput);

    if (!access.allowed) {
      return {
        allowed: false,
        status: 403,
        error: "Dashboard access denied."
      } as const;
    }

    return {
      allowed: true,
      guild: discordGuild,
      role: access.role
    } as const;
  } finally {
    await dbConnection.close();
  }
}

async function fetchAuthorizedMemberRoleIds(guildId: string, userId: string) {
  if (!env.DISCORD_BOT_TOKEN) {
    return [];
  }

  return fetchGuildMemberRoleIds(env.DISCORD_BOT_TOKEN, guildId, userId);
}
