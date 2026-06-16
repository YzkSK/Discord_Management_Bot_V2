import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../../dashboard-auth";

export const dynamic = "force-dynamic";

interface VoicevoxStyle {
  id: number;
  name: string;
}

interface VoicevoxSpeaker {
  name: string;
  styles: VoicevoxStyle[];
}

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

  const voicevoxUrl = process.env.VOICEVOX_URL;
  if (!voicevoxUrl) {
    return NextResponse.json({ speakers: [] });
  }

  try {
    const res = await fetch(
      `${voicevoxUrl.replace(/\/$/, "")}/speakers`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ speakers: [] });

    const data = (await res.json()) as VoicevoxSpeaker[];
    const speakers = data
      .flatMap((char) =>
        char.styles.map((style) => ({
          id: style.id,
          label:
            char.styles.length === 1
              ? char.name
              : `${char.name} - ${style.name}`
        }))
      )
      .sort((a, b) => a.id - b.id);

    return NextResponse.json({ speakers });
  } catch {
    return NextResponse.json({ speakers: [] });
  }
}
