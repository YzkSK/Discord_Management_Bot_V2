import {
  createDbConnection,
  createRecruitment,
  getGuildConfigByGuildId,
  setRecruitmentMessageId
} from "@discord-bot/db";
import {
  getLocale,
  isGuildLanguage,
  RECRUITMENT_DEADLINE_DEFAULT_DAYS,
  RECRUITMENT_DEADLINE_MAX_DAYS,
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS
} from "@discord-bot/shared";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../../dashboard-auth";
import { fetchGuildChannels } from "../../../../discord-api";

export const dynamic = "force-dynamic";

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() { return (_env ??= parseDashboardAuthEnv()); }

const TEXT_CHANNEL_TYPES = new Set([0, 5]); // GUILD_TEXT, GUILD_ANNOUNCEMENT

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
    const guildConfig = await getGuildConfigByGuildId(
      dbConnection.db,
      authorization.guild.id
    );
    const channelId = guildConfig?.recruitmentChannelId ?? null;

    if (channelId) {
      return NextResponse.json({ channelId, channels: null });
    }

    const botToken = getEnv().DISCORD_BOT_TOKEN;
    const channels = botToken
      ? (await fetchGuildChannels(botToken, authorization.guild.id).catch(() => []))
          .filter((c) => TEXT_CHANNEL_TYPES.has(c.type))
      : [];

    return NextResponse.json({ channelId: null, channels });
  } finally {
    await dbConnection.close();
  }
}

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const COMPONENT_TYPE_TEXT_DISPLAY = 10;
const COMPONENT_TYPE_SEPARATOR = 14;
const COMPONENT_TYPE_CONTAINER = 17;
const BUTTON_STYLE_PRIMARY = 1;
const BUTTON_STYLE_DANGER = 4;
const MESSAGE_FLAG_IS_COMPONENTS_V2 = 1 << 15;
const TEAL_COLOR = 0x1abc9c;

export async function POST(request: NextRequest) {
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

  const genre = readBodyString(body, "genre");
  const content = readBodyString(body, "content");
  const capacity = body?.capacity;
  const deadlineDaysRaw = body?.deadlineDays;

  if (!genre) {
    return NextResponse.json({ error: "genre is required." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) {
    return NextResponse.json({ error: "capacity must be an integer between 1 and 99." }, { status: 400 });
  }

  const deadlineDays =
    deadlineDaysRaw === undefined || deadlineDaysRaw === null
      ? RECRUITMENT_DEADLINE_DEFAULT_DAYS
      : deadlineDaysRaw;
  if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > RECRUITMENT_DEADLINE_MAX_DAYS) {
    return NextResponse.json(
      { error: `deadlineDays must be an integer between 1 and ${RECRUITMENT_DEADLINE_MAX_DAYS}.` },
      { status: 400 }
    );
  }
  const deadlineAt = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);

  const dbConnection = createDbConnection();
  try {
    const guildConfig = await getGuildConfigByGuildId(dbConnection.db, authorization.guild.id);
    const channelId =
      guildConfig?.recruitmentChannelId || readBodyString(body, "channelId") || null;
    if (!channelId) {
      return NextResponse.json(
        { error: "投稿先チャンネルを指定してください。" },
        { status: 422 }
      );
    }

    const rawLang = guildConfig?.language;
    const lang = rawLang && isGuildLanguage(rawLang) ? rawLang : "ja";
    const loc = getLocale(lang);

    const recruitment = await createRecruitment(dbConnection.db, {
      guildId: authorization.guild.id,
      channelId,
      creatorId: authorization.userId,
      genre,
      capacity,
      content,
      deadlineAt
    });

    const messagePayload = buildRecruitmentMessage(recruitment, loc, deadlineAt);
    const messageId = await postDiscordMessage(channelId, messagePayload);

    if (messageId) {
      await setRecruitmentMessageId(dbConnection.db, {
        recruitmentId: recruitment.id,
        messageId
      });
    }

    return NextResponse.json({ recruitment, messageId });
  } finally {
    await dbConnection.close();
  }
}

function formatDeadlineText(deadlineAt: Date, loc: ReturnType<typeof getLocale>): string {
  const msLeft = deadlineAt.getTime() - Date.now();

  if (msLeft > COUNTDOWN_THRESHOLD_24H_MS) {
    return loc.recruitmentPostDeadlineAbsolute({
      timestamp: Math.floor(deadlineAt.getTime() / 1000)
    });
  }

  if (msLeft > COUNTDOWN_THRESHOLD_1H_MS) {
    const hours = Math.floor(msLeft / COUNTDOWN_THRESHOLD_1H_MS);
    const minutes = Math.floor((msLeft % COUNTDOWN_THRESHOLD_1H_MS) / 60_000);
    return loc.recruitmentPostDeadlineHours({ hours, minutes });
  }

  const minutes = Math.max(1, Math.floor(msLeft / 60_000));
  return loc.recruitmentPostDeadlineMinutes({ minutes });
}

function buildRecruitmentMessage(
  recruitment: {
    id: string;
    genre: string;
    capacity: number;
    content: string;
    creatorId: string;
    voiceChannelId: string | null;
    status: string;
  },
  loc: ReturnType<typeof getLocale>,
  deadlineAt: Date
) {
  const vcText = recruitment.voiceChannelId
    ? loc.recruitmentPostVc({ id: recruitment.voiceChannelId })
    : loc.recruitmentPostNoVc;
  const deadlineText = formatDeadlineText(deadlineAt, loc);

  return {
    flags: MESSAGE_FLAG_IS_COMPONENTS_V2,
    components: [
      {
        type: COMPONENT_TYPE_CONTAINER,
        accent_color: TEAL_COLOR,
        components: [
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: `## ${loc.recruitmentPostTitle({ title: recruitment.genre })}`
          },
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: `${loc.recruitmentStatusOpen}  ·  👥 0 / ${recruitment.capacity}`
          },
          { type: COMPONENT_TYPE_SEPARATOR },
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: recruitment.content
          },
          { type: COMPONENT_TYPE_SEPARATOR },
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: loc.recruitmentPostCreator({ id: recruitment.creatorId })
          },
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: vcText
          },
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: deadlineText
          },
          {
            type: COMPONENT_TYPE_TEXT_DISPLAY,
            content: loc.recruitmentNoParticipants
          }
        ]
      },
      {
        type: COMPONENT_TYPE_ACTION_ROW,
        components: [
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:join:${recruitment.id}`,
            label: loc.recruitmentButtonJoin,
            style: BUTTON_STYLE_PRIMARY
          },
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:leave:${recruitment.id}`,
            label: loc.recruitmentButtonLeave,
            style: BUTTON_STYLE_PRIMARY
          },
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:close:${recruitment.id}`,
            label: loc.recruitmentButtonClose,
            style: BUTTON_STYLE_DANGER
          }
        ]
      }
    ]
  };
}

async function postDiscordMessage(channelId: string, payload: unknown) {
  const botToken = getEnv().DISCORD_BOT_TOKEN;
  if (!botToken) {
    return null;
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    console.error("failed to post recruitment message to Discord", {
      channelId,
      status: response.status
    });
    return null;
  }

  const data = await response.json() as { id?: string };
  return data.id ?? null;
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
