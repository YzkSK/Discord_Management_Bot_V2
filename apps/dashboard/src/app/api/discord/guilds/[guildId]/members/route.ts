import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeDashboardApi } from "../../../../../../dashboard-auth";
import { buildAvatarUrl } from "../../../../../../lib/discord-user";
import { fetchGuildMembersSearch } from "../../../../../../discord-api";

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() { return (_env ??= parseDashboardAuthEnv()); }

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const auth = await authorizeDashboardApi({ request, guildId });
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const botToken = getEnv().DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 503 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (!query.trim()) {
    return NextResponse.json({ members: [] });
  }

  try {
    const results = await fetchGuildMembersSearch(botToken, guildId, query);
    const members = results.map((m) => ({
      id: m.user.id,
      displayName: m.nick ?? m.user.global_name ?? m.user.username,
      username: m.user.username,
      avatarUrl: buildAvatarUrl(m.user.id, m.user.avatar),
    }));
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: "Failed to search members" }, { status: 500 });
  }
}
