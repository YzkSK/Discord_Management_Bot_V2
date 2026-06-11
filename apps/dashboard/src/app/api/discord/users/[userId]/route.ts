import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse } from "next/server";
import { getDashboardSession } from "../../../../../auth";
import { buildAvatarUrl, fetchDiscordApiUser } from "../../../../../lib/discord-user";

const env = parseDashboardAuthEnv();

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  if (!env.DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { error: "Bot token not configured" },
      { status: 503 }
    );
  }

  try {
    const user = await fetchDiscordApiUser(userId, env.DISCORD_BOT_TOKEN);
    if (!user) {
      return NextResponse.json({
        id: userId,
        username: "Unknown User",
        globalName: null,
        avatarUrl: buildAvatarUrl(userId, null),
      });
    }
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
