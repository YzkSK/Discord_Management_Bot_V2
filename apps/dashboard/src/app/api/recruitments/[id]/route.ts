import {
  createDbConnection,
  closeRecruitment,
  reopenRecruitment,
  getRecruitmentById,
  getGuildConfigByGuildId,
  listActiveRecruitmentParticipants,
  listQueuedParticipants,
} from "@discord-bot/db";
import {
  getLocale,
  isGuildLanguage,
  REOPEN_DEADLINE_HOURS,
} from "@discord-bot/shared";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../../dashboard-auth";
import { buildRecruitmentUpdatePayload } from "./message";

export const dynamic = "force-dynamic";

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() {
  return (_env ??= parseDashboardAuthEnv());
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recruitmentId } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;
  const guildId =
    typeof body?.guildId === "string" ? body.guildId.trim() : undefined;

  if (action !== "close" && action !== "reopen") {
    return NextResponse.json(
      { error: "action must be 'close' or 'reopen'" },
      { status: 400 }
    );
  }

  const authorization = await authorizeDashboardApi({
    request,
    guildId,
    requiredRole: "viewer",
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();
  try {
    const recruitment = await getRecruitmentById(dbConnection.db, recruitmentId);

    if (!recruitment || recruitment.guildId !== authorization.guild.id) {
      return NextResponse.json(
        { error: "Recruitment not found." },
        { status: 404 }
      );
    }

    if (
      authorization.role === "viewer" &&
      recruitment.creatorId !== authorization.userId
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const guildConfig = await getGuildConfigByGuildId(
      dbConnection.db,
      authorization.guild.id
    );
    const rawLang = guildConfig?.language;
    const lang = rawLang && isGuildLanguage(rawLang) ? rawLang : "ja";
    const loc = getLocale(lang);

    if (action === "close") {
      if (recruitment.status === "closed") {
        return NextResponse.json(
          { error: "Already closed." },
          { status: 400 }
        );
      }

      const updated = await closeRecruitment(dbConnection.db, {
        recruitmentId: recruitment.id,
      });

      await patchDiscordMessage(dbConnection.db, updated ?? recruitment, loc);

      return NextResponse.json({ recruitment: updated });
    }

    // reopen
    if (recruitment.status !== "closed") {
      return NextResponse.json(
        { error: "Not closed." },
        { status: 400 }
      );
    }

    const activeParticipants = await listActiveRecruitmentParticipants(
      dbConnection.db,
      recruitment.id
    );
    const nextStatus =
      activeParticipants.length >= recruitment.capacity ? "full" : "open";
    const deadlineAt = new Date(
      Date.now() + REOPEN_DEADLINE_HOURS * 60 * 60 * 1000
    );

    const updated = await reopenRecruitment(dbConnection.db, {
      recruitmentId: recruitment.id,
      status: nextStatus,
      deadlineAt,
    });

    await patchDiscordMessage(dbConnection.db, updated ?? recruitment, loc);

    return NextResponse.json({ recruitment: updated });
  } finally {
    await dbConnection.close();
  }
}

async function patchDiscordMessage(
  db: ReturnType<typeof createDbConnection>["db"],
  recruitment: {
    id: string;
    channelId: string;
    messageId: string | null;
    genre: string;
    content: string;
    creatorId: string;
    voiceChannelId: string | null;
    status: string;
    capacity: number;
    deadlineAt: Date | null;
  },
  loc: ReturnType<typeof getLocale>
) {
  const botToken = getEnv().DISCORD_BOT_TOKEN;
  if (!botToken || !recruitment.messageId) return;

  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(db, recruitment.id),
    listQueuedParticipants(db, recruitment.id),
  ]);

  const payload = buildRecruitmentUpdatePayload({
    recruitment: {
      ...recruitment,
      status: recruitment.status as "open" | "full" | "closed",
    },
    participantIds: participants.map((p) => p.userId),
    queuedIds: queued.map((p) => p.userId),
    loc,
  });

  const res = await fetch(
    `https://discord.com/api/v10/channels/${recruitment.channelId}/messages/${recruitment.messageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    console.error("failed to patch recruitment message", {
      recruitmentId: recruitment.id,
      status: res.status,
    });
  }
}
