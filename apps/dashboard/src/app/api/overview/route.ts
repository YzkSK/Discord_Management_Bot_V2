import {
  createDbConnection,
  listLogEvents,
  listRecruitmentDashboardState,
  listVoiceDashboardState
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("guildId")?.trim();
  const guildId = raw || undefined;

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
    const [voiceState, recruitmentRows, logResult] = await Promise.all([
      listVoiceDashboardState(dbConnection.db, {
        guildId: authorization.guild.id
      }),
      listRecruitmentDashboardState(dbConnection.db, {
        guildId: authorization.guild.id
      }),
      listLogEvents(dbConnection.db, {
        guildId: authorization.guild.id,
        limit: 50
      })
    ]);

    return NextResponse.json({
      sessions: voiceState.sessions.map((s) => ({
        id: s.id,
        channelId: s.channelId,
        memberCount: s.memberCount,
        startedAt: s.startedAt.toISOString(),
        status: s.status
      })),
      recruitments: recruitmentRows.map((r) => ({
        id: r.id,
        status: r.status
      })),
      logItems: logResult.items.map((log) => ({
        id: log.id,
        eventName: log.eventName,
        guildId: log.guildId,
        actorId: log.actorId,
        channelId: log.channelId,
        messageId: log.messageId,
        eventTimestamp: log.eventTimestamp.toISOString(),
        receivedAt: log.receivedAt.toISOString(),
        realtimeEnabled: log.realtimeEnabled,
        payload: log.payload
      }))
    });
  } finally {
    await dbConnection.close();
  }
}
