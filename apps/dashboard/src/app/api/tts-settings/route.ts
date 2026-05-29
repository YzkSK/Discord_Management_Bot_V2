import {
  clearGuildDefaultTtsSpeaker,
  clearUserTtsSpeaker,
  createDbConnection,
  deleteTtsDictionaryEntry,
  ensureTtsDictionaryEntry,
  getGuildDefaultTtsSpeaker,
  listGuildTtsDictionaryEntries,
  listUserTtsSpeakers,
  setGuildDefaultTtsSpeaker,
  setUserTtsSpeaker
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import {
  parseTtsDictionaryDeleteBody,
  parseTtsDictionaryPatchBody,
  parseTtsSpeakerDeleteBody,
  parseTtsSpeakerPatchBody
} from "./validation";

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
    const [dictionaryEntries, guildDefaultSpeaker, userSpeakers] =
      await Promise.all([
        listGuildTtsDictionaryEntries(dbConnection.db, {
          guildId: authorization.guild.id
        }),
        getGuildDefaultTtsSpeaker(dbConnection.db, authorization.guild.id),
        listUserTtsSpeakers(dbConnection.db, authorization.guild.id)
      ]);

    return NextResponse.json({
      accessRole: authorization.role,
      dictionaryEntries,
      guildDefaultSpeaker,
      guildId: authorization.guild.id,
      userSpeakers
    });
  } finally {
    await dbConnection.close();
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
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
    if (isKind(body, "speaker")) {
      const parsed = parseTtsSpeakerPatchBody(body);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const setting =
        parsed.value.target === "guild-default"
          ? await setGuildDefaultTtsSpeaker(dbConnection.db, parsed.value)
          : await setUserTtsSpeaker(dbConnection.db, parsed.value);

      return NextResponse.json({ setting });
    }

    const parsed = parseTtsDictionaryPatchBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const entry = await ensureTtsDictionaryEntry(dbConnection.db, parsed.value);
    return NextResponse.json({ entry });
  } finally {
    await dbConnection.close();
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
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
    if (isKind(body, "speaker")) {
      const parsed = parseTtsSpeakerDeleteBody(body);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const setting =
        parsed.value.target === "guild-default"
          ? await clearGuildDefaultTtsSpeaker(dbConnection.db, parsed.value.guildId)
          : await clearUserTtsSpeaker(dbConnection.db, parsed.value);

      return NextResponse.json({ setting });
    }

    const parsed = parseTtsDictionaryDeleteBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const entry = await deleteTtsDictionaryEntry(dbConnection.db, parsed.value);
    return NextResponse.json({ entry });
  } finally {
    await dbConnection.close();
  }
}

function optionalParam(query: URLSearchParams, key: string) {
  const value = query.get(key)?.trim();
  return value ? value : undefined;
}

function readBodyGuildId(body: unknown) {
  return typeof body === "object" &&
    body !== null &&
    "guildId" in body &&
    typeof body.guildId === "string"
    ? body.guildId.trim()
    : "";
}

function isKind(body: unknown, kind: string) {
  return (
    typeof body === "object" &&
    body !== null &&
    "kind" in body &&
    body.kind === kind
  );
}
