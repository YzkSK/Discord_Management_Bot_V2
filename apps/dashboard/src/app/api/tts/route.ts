import {
  createDbConnection,
  getGuildConfigByGuildId,
  getGuildDefaultTtsSpeaker,
  listGuildTtsDictionaryEntries,
  listUserTtsSpeakers
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { buildTtsSummary } from "./summary";

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
    const [config, dictionaryEntries, guildDefaultSpeaker, userSpeakers] =
      await Promise.all([
        getGuildConfigByGuildId(dbConnection.db, authorization.guild.id),
        listGuildTtsDictionaryEntries(dbConnection.db, {
          guildId: authorization.guild.id
        }),
        getGuildDefaultTtsSpeaker(dbConnection.db, authorization.guild.id),
        listUserTtsSpeakers(dbConnection.db, authorization.guild.id)
      ]);

    return NextResponse.json({
      accessRole: authorization.role,
      ...buildTtsSummary({
        dictionaryEntries: dictionaryEntries.map((entry) => ({
          ...entry,
          scope: entry.scope === "user" ? "user" : "guild"
        })),
        guildDefaultSpeaker,
        guildId: authorization.guild.id,
        ttsTextChannelId: config?.ttsTextChannelId ?? null,
        userSpeakers
      })
    });
  } finally {
    await dbConnection.close();
  }
}

function optionalParam(query: URLSearchParams, key: string) {
  const value = query.get(key)?.trim();
  return value ? value : undefined;
}
