import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse } from "next/server";
import { getDashboardSession } from "../../../../auth";
import { fetchUser, fallbackUser } from "../../../../lib/discord-user-server";

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() { return (_env ??= parseDashboardAuthEnv()); }

export const dynamic = "force-dynamic";

// Batch fetch: GET /api/discord/users?ids=1,2,3,...
export async function GET(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = getEnv().DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 503 });
  }

  const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({});
  }

  const results = await Promise.allSettled(ids.map((id) => fetchUser(id, botToken)));
  const users: Record<string, unknown> = {};
  ids.forEach((id, i) => {
    const r = results[i]!;
    users[id] = r.status === "fulfilled" ? (r.value ?? fallbackUser(id)) : fallbackUser(id);
  });

  return NextResponse.json(users);
}
