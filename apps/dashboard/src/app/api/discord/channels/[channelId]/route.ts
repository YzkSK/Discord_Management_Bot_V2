import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse } from "next/server";
import { getDashboardSession } from "../../../../../auth";
import { fetchDiscordApiChannel } from "../../../../../lib/discord-channel";

const env = parseDashboardAuthEnv();

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;

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
