import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeDashboardApi } from "../../../../../dashboard-auth";
import { fetchDiscordApiChannel } from "../../../../../lib/discord-channel";

const env = parseDashboardAuthEnv();

export const dynamic = "force-dynamic";

const SNOWFLAKE_RE = /^\d{17,20}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;

  if (!SNOWFLAKE_RE.test(channelId)) {
    return NextResponse.json({ error: "Invalid channel id." }, { status: 400 });
  }

  const rawGuildId = request.nextUrl.searchParams.get("guildId");
  if (rawGuildId !== null && !SNOWFLAKE_RE.test(rawGuildId)) {
    return NextResponse.json({ error: "Invalid guild id." }, { status: 400 });
  }
  const guildId = rawGuildId ?? undefined;
  const auth = await authorizeDashboardApi({ request, guildId });
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!env.DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { error: "Bot token not configured" },
      { status: 503 }
    );
  }

  try {
    const channel = await fetchDiscordApiChannel(channelId, env.DISCORD_BOT_TOKEN);
    if (!channel) {
      return NextResponse.json({ id: channelId, name: "Unknown Channel" });
    }
    return NextResponse.json(channel);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 }
    );
  }
}
