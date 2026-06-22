import {
  createDbConnection,
  listRecruitmentDashboardState
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { optionalParam } from "../../../lib/request-params";
import { buildRecruitmentSummary } from "./summary";

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
    const recruitments = await listRecruitmentDashboardState(dbConnection.db, {
      guildId: authorization.guild.id
    });

    return NextResponse.json({
      accessRole: authorization.role,
      guildId: authorization.guild.id,
      ...buildRecruitmentSummary({
        guildId: authorization.guild.id,
        recruitments
      })
    });
  } finally {
    await dbConnection.close();
  }
}

