import { NextResponse, type NextRequest } from "next/server";

const SAMPLE_TEXT = "テストです。よろしくお願いします。";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const speakerIdParam = request.nextUrl.searchParams.get("speakerId");
  const speakerId = speakerIdParam ? Number(speakerIdParam) : NaN;

  if (!Number.isInteger(speakerId) || speakerId < 0) {
    return NextResponse.json({ error: "speakerId must be a non-negative integer." }, { status: 400 });
  }

  const voicevoxUrl = process.env.VOICEVOX_URL;

  if (!voicevoxUrl) {
    return NextResponse.json({ error: "VOICEVOX_URL is not configured." }, { status: 502 });
  }

  const baseUrl = voicevoxUrl.replace(/\/$/, "");

  try {
    const queryUrl = new URL(`${baseUrl}/audio_query`);
    queryUrl.searchParams.set("speaker", String(speakerId));
    queryUrl.searchParams.set("text", SAMPLE_TEXT);

    const queryRes = await fetch(queryUrl, { method: "POST" });
    if (!queryRes.ok) {
      return NextResponse.json({ error: "VOICEVOX audio_query failed." }, { status: 502 });
    }

    const query = await queryRes.json();

    const synthUrl = new URL(`${baseUrl}/synthesis`);
    synthUrl.searchParams.set("speaker", String(speakerId));

    const synthRes = await fetch(synthUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(query)
    });

    if (!synthRes.ok) {
      return NextResponse.json({ error: "VOICEVOX synthesis failed." }, { status: 502 });
    }

    const audioBuffer = await synthRes.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: { "content-type": "audio/wav" }
    });
  } catch {
    return NextResponse.json({ error: "VOICEVOX unavailable." }, { status: 502 });
  }
}
