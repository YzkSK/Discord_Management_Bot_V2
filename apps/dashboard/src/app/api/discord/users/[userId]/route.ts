import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse } from "next/server";
import { getDashboardSession } from "../../../../../auth";
import { fetchUser, fallbackUser } from "../../../../../lib/discord-user-server";

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() { return (_env ??= parseDashboardAuthEnv()); }

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
  const botToken = getEnv().DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 503 });
  }

  try {
    const user = await fetchUser(userId, botToken);
    return NextResponse.json(user ?? fallbackUser(userId));
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
