import { parseDashboardAuthEnv } from "@discord-bot/config";
import { createDbConnection, listDiscordChannelNamesByIds, upsertDiscordChannel } from "@discord-bot/db";
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

  const guildId = request.nextUrl.searchParams.get("guildId") ?? undefined;
  const auth = await authorizeDashboardApi({ request, guildId });
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const dbConnection = createDbConnection();

  try {
    const cached = await listDiscordChannelNamesByIds(dbConnection.db, [channelId]);
    const cachedName = cached.get(channelId);
    if (cachedName) {
      return NextResponse.json({ id: channelId, name: cachedName });
    }
  } finally {
    await dbConnection.close();
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
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    if (guildId) {
      const dbConnection2 = createDbConnection();
      upsertDiscordChannel(dbConnection2.db, { channelId, guildId, name: channel.name })
        .finally(() => dbConnection2.close())
        .catch((err) => console.error("[discord/channels] upsert failed:", err));
    }
    return NextResponse.json(channel);
  } catch (err) {
    console.error("[discord/channels] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 }
    );
  }
}
