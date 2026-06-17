import { createDbConnection, getKnownGuildIds, getGuildsWithManagementRoles, getGuildManagementRoleIds } from "@discord-bot/db";
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
      const withRoles = await getGuildsWithManagementRoles(
        db.db,
        remaining.map((g) => g.id)
      );

      const userId = token.sub;
      const botToken = env.DISCORD_BOT_TOKEN;

      if (userId && botToken) {
        const results = await Promise.all(
          withRoles.map(async (guildId) => {
            const guild = remaining.find((g) => g.id === guildId)!;
            const [managementRoleIds, userRoleIds] = await Promise.all([
              getGuildManagementRoleIds(db.db, guildId),
              fetchGuildMemberRoleIds(botToken, guildId, userId)
            ]);
            const allowed = managementRoleIds.length > 0 &&
              userRoleIds.some((r) => managementRoleIds.includes(r));
            return allowed ? guild : null;
          })
        );
        for (const guild of results) {
          if (guild) passed.push(guild);
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
