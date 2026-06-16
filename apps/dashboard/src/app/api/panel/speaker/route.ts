import {
  clearUserTtsSpeaker,
  createDbConnection,
  getUserTtsSpeaker,
  setUserTtsSpeaker
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../../dashboard-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get("guildId")?.trim() || undefined;
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
    const setting = await getUserTtsSpeaker(dbConnection.db, {
      guildId: authorization.guild.id,
      userId: authorization.userId
    });

    return NextResponse.json({
      guildId: authorization.guild.id,
      userId: authorization.userId,
      setting
    });
  } finally {
    await dbConnection.close();
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guildId = readBodyString(body, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId: guildId || undefined,
    requiredRole: "viewer"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const speakerId = body?.speakerId;
  if (!Number.isInteger(speakerId) || speakerId < 0) {
    return NextResponse.json({ error: "speakerId must be a non-negative integer." }, { status: 400 });
  }

  const dbConnection = createDbConnection();
  try {
    const setting = await setUserTtsSpeaker(dbConnection.db, {
      guildId: authorization.guild.id,
      userId: authorization.userId,
      speakerId
    });

    return NextResponse.json({ setting });
  } finally {
    await dbConnection.close();
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guildId = readBodyString(body, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId: guildId || undefined,
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
    const setting = await clearUserTtsSpeaker(dbConnection.db, {
      guildId: authorization.guild.id,
      userId: authorization.userId
    });

    return NextResponse.json({ setting });
  } finally {
    await dbConnection.close();
  }
}

function readBodyString(body: unknown, key: string) {
  if (
    typeof body === "object" &&
    body !== null &&
    key in body &&
    typeof (body as Record<string, unknown>)[key] === "string"
  ) {
    return ((body as Record<string, unknown>)[key] as string).trim();
  }
  return "";
}
