import {
  createDbConnection,
  getKnownGuildIds,
  getGuildsWithManagementRoles,
  getGuildManagementRoleIds,
  getGuildsWithUserAccessGrant,
  getGuildsWithRoleAccessGrants,
  listDashboardAccessGrants
} from "@discord-bot/db";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthOptions } from "../../../auth";
import {
  getUsableDiscordAccessToken,
  toDashboardDiscordToken
} from "../../../auth-token";
import {
  DiscordApiError,
  fetchCurrentUserGuilds,
  fetchGuildMemberRoleIds
} from "../../../discord-api";
import { hasDirectManagementPermission } from "./guild-filter";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const env = parseDashboardAuthEnv();
  const authOptions = getAuthOptions();
  const token = await getToken({
    req: request,
    ...(authOptions.secret ? { secret: authOptions.secret } : {})
  });

  if (!token?.sub || (!token.discordAccessToken && !token.discordRefreshToken)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const accessToken = await getUsableDiscordAccessToken({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    token: toDashboardDiscordToken(token)
  });

  if (!accessToken.ok) {
    return NextResponse.json({ error: accessToken.error }, { status: 401 });
  }

  let userGuilds;
  try {
    userGuilds = await fetchCurrentUserGuilds(accessToken.accessToken);
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 401) {
      return NextResponse.json({ error: "Authentication expired." }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to fetch Discord guilds." }, { status: 502 });
  }

  const directPass = userGuilds.filter(hasDirectManagementPermission);
  const directPassIds = new Set(directPass.map((g) => g.id));
  const remaining = userGuilds.filter((g) => !directPassIds.has(g.id));

  const passed = [...directPass];

  const db = createDbConnection();
  try {
    if (remaining.length > 0) {
      const userId = token.sub;
      const botToken = env.DISCORD_BOT_TOKEN;

      if (userId) {
        // User-level access grants pass without needing Discord role IDs
        const userGrantIds = await getGuildsWithUserAccessGrant(
          db.db,
          userId,
          remaining.map((g) => g.id)
        );
        const userGrantSet = new Set(userGrantIds);
        for (const guild of remaining) {
          if (userGrantSet.has(guild.id)) passed.push(guild);
        }

        // Management roles + role-based access grants require the user's role IDs
        const stillRemaining = remaining.filter((g) => !userGrantSet.has(g.id));
        if (stillRemaining.length > 0 && botToken) {
          const stillRemainingIds = stillRemaining.map((g) => g.id);
          const [withManagement, withRoleGrants] = await Promise.all([
            getGuildsWithManagementRoles(db.db, stillRemainingIds),
            getGuildsWithRoleAccessGrants(db.db, stillRemainingIds)
          ]);
          const needsRoleCheck = [...new Set([...withManagement, ...withRoleGrants])];

          const results = await Promise.all(
            needsRoleCheck.map(async (guildId) => {
              const guild = stillRemaining.find((g) => g.id === guildId)!;
              const [managementRoleIds, userRoleIds] = await Promise.all([
                getGuildManagementRoleIds(db.db, guildId),
                fetchGuildMemberRoleIds(botToken, guildId, userId)
              ]);
              const hasManagementRole =
                managementRoleIds.length > 0 &&
                userRoleIds.some((r) => managementRoleIds.includes(r));
              const grants = await listDashboardAccessGrants(db.db, {
                guildId,
                userId,
                roleIds: userRoleIds
              });
              return (hasManagementRole || grants.length > 0) ? guild : null;
            })
          );
          for (const guild of results) {
            if (guild) passed.push(guild);
          }
        }
      }
    }

    const allPassedIds = passed.map((g) => g.id);
    const knownIds = await getKnownGuildIds(db.db, allPassedIds);

    const result = passed
      .filter((g) => knownIds.has(g.id))
      .map((g) => ({ id: g.id, name: g.name }));

    return NextResponse.json({ guilds: result });
  } finally {
    await db.close();
  }
}
