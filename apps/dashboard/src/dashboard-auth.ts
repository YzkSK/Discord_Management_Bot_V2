import { parseDashboardAuthEnv } from "@discord-bot/config";
import { createDbConnection } from "@discord-bot/db";
import type { DashboardAccessRole } from "@discord-bot/shared";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { resolveDashboardAccess } from "./authorization";
import { authOptions, getDashboardSession } from "./auth";
import {
  getUsableDiscordAccessToken,
  toDashboardDiscordToken
} from "./auth-token";
import {
  DiscordApiError,
  fetchCurrentUserGuildById,
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

  if (!token?.sub || (!token.discordAccessToken && !token.discordRefreshToken)) {
    return {
      allowed: false,
      status: 401,
      error: "Authentication required."
    } as const;
  }

  const accessToken = await getUsableDiscordAccessToken({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    token: toDashboardDiscordToken(token)
  });

  if (!accessToken.ok) {
    return {
      allowed: false,
      status: 401,
      error: accessToken.error
    } as const;
  }

  let discordGuild;
  try {
    discordGuild = await fetchCurrentUserGuildById(
      accessToken.accessToken,
      input.guildId
    );
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 401) {
      return {
        allowed: false,
        status: 401,
        error: "Authentication expired."
      } as const;
    }

    return {
      allowed: false,
      status: 502,
      error: "Discord API error."
    } as const;
  }

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
      role: access.role,
      userId: token.sub
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

export async function getDashboardPageRole(guildId: string): Promise<"viewer" | "admin" | "owner" | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const token = await getToken({
    req: { headers: { cookie: cookieHeader } } as unknown as Parameters<typeof getToken>[0]["req"],
    ...(authOptions.secret ? { secret: authOptions.secret } : {})
  });

  if (!token?.sub) {
    return null;
  }

  const accessToken = await getUsableDiscordAccessToken({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    token: toDashboardDiscordToken(token)
  });

  let isGuildOwner = false;
  let roleIds: string[] = [];

  if (accessToken.ok) {
    try {
      const discordGuild = await fetchCurrentUserGuildById(
        accessToken.accessToken,
        guildId
      );
      if (discordGuild) {
        isGuildOwner = discordGuild.owner;
        if (!isGuildOwner) {
          roleIds = await fetchAuthorizedMemberRoleIds(guildId, token.sub);
        }
      }
    } catch {
    }
  }

  const dbConnection = createDbConnection();
  try {
    const access = await resolveDashboardAccess({
      db: dbConnection.db,
      guildId,
      userId: token.sub,
      isGuildOwner,
      roleIds
    });
    if (!access.allowed || !("role" in access) || !access.role) return null;
    return access.role;
  } finally {
    await dbConnection.close();
  }
}
