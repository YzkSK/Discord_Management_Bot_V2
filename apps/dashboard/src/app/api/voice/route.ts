import {
  createDbConnection,
  listVoiceDashboardState
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { buildVoiceSummary } from "./summary";

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
    const state = await listVoiceDashboardState(dbConnection.db, {
      guildId: authorization.guild.id
    });

    return NextResponse.json({
      accessRole: authorization.role,
      guildId: authorization.guild.id,
      ...buildVoiceSummary(state)
    });
  } finally {
    await dbConnection.close();
  }
}

function optionalParam(query: URLSearchParams, key: string) {
  const value = query.get(key)?.trim();
  return value ? value : undefined;
}
