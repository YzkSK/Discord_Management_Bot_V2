import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createVoicevoxClient, getVoicevoxSpeakers, normalizeTtsText } from "./voicevox.js";

describe("normalizeTtsText", () => {
  it("skips bot-authored messages", () => {
    assert.equal(
      normalizeTtsText({ authorIsBot: true, content: "hello" }),
      null
    );
  });

  it("skips empty and command-like messages", () => {
    assert.equal(normalizeTtsText({ content: "   " }), null);
    assert.equal(normalizeTtsText({ content: "/join" }), null);
  });

  it("trims and collapses readable message text", () => {
    assert.equal(
      normalizeTtsText({ content: "  hello\n\nworld  " }),
      "hello world"
    );
  });

  it("limits overly long text", () => {
    const text = normalizeTtsText({ content: "abcdef", maxLength: 4 });

    assert.equal(text, "abcd");
  });
});

describe("createVoicevoxClient", () => {
  it("uses the configured speaker for audio query and synthesis", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      urls.push(String(url));

      if (String(url).includes("/audio_query")) {
        return new Response(JSON.stringify({ accent_phrases: [] }), {
          status: 200
        });
      }

      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };
    const client = createVoicevoxClient({
      baseUrl: "http://voicevox:50021",
      fetch: fetchImpl,
      speaker: 2
    });

    await client.synthesize("hello");

    assert.equal(urls[0]?.includes("speaker=2"), true);
    assert.equal(urls[1]?.includes("speaker=2"), true);
  });

  it("uses a per-call speaker override when provided", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      urls.push(String(url));

      if (String(url).includes("/audio_query")) {
        return new Response(JSON.stringify({ accent_phrases: [] }), {
          status: 200
        });
      }

      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };
    const client = createVoicevoxClient({
      baseUrl: "http://voicevox:50021",
      fetch: fetchImpl,
      speaker: 2
    });

    await client.synthesize("hello", 5);

    assert.equal(urls[0]?.includes("speaker=5"), true);
    assert.equal(urls[1]?.includes("speaker=5"), true);
  });

  it("retries VOICEVOX failures with backoff", async () => {
    let synthesisAttempts = 0;
    const delays: number[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      if (String(url).includes("/audio_query")) {
        return new Response(JSON.stringify({ accent_phrases: [] }), {
          status: 200
        });
      }

      synthesisAttempts += 1;
      if (synthesisAttempts === 1) {
        return new Response("busy", { status: 503 });
      }

      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };
    const client = createVoicevoxClient({
      baseUrl: "http://voicevox:50021",
      fetch: fetchImpl,
      retry: {
        baseDelayMs: 25,
        maxAttempts: 2,
        sleep: async (delayMs) => {
          delays.push(delayMs);
        }
      },
      speaker: 2
    });

    const audio = await client.synthesize("hello");

    assert.equal(synthesisAttempts, 2);
    assert.deepEqual(delays, [25]);
    assert.deepEqual([...audio], [1, 2, 3]);
  });

  it("retries audio query failures with backoff", async () => {
    let audioQueryAttempts = 0;
    const delays: number[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      if (String(url).includes("/audio_query")) {
        audioQueryAttempts += 1;
        if (audioQueryAttempts === 1) {
          return new Response("busy", { status: 503 });
        }

        return new Response(JSON.stringify({ accent_phrases: [] }), {
          status: 200
        });
      }

      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };
    const client = createVoicevoxClient({
      baseUrl: "http://voicevox:50021",
      fetch: fetchImpl,
      retry: {
        baseDelayMs: 25,
        maxAttempts: 2,
        sleep: async (delayMs) => {
          delays.push(delayMs);
        }
      },
      speaker: 2
    });

    const audio = await client.synthesize("hello");

    assert.equal(audioQueryAttempts, 2);
    assert.deepEqual(delays, [25]);
    assert.deepEqual([...audio], [1, 2, 3]);
  });
});

describe("getVoicevoxSpeakers", () => {
  it("fetches and returns the speaker list", async () => {
    const speakers = [
      {
        name: "四国めたん",
        speaker_uuid: "uuid-1",
        styles: [
          { id: 2, name: "ノーマル", type: "talk" },
          { id: 0, name: "あまあま", type: "talk" }
        ]
      }
    ];
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify(speakers), { status: 200 });

    const result = await getVoicevoxSpeakers("http://voicevox:50021", fetchImpl);

    assert.deepEqual(result, speakers);
  });

  it("returns an empty array when VOICEVOX is unreachable", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };

    const result = await getVoicevoxSpeakers("http://voicevox:50021", fetchImpl);

    assert.deepEqual(result, []);
  });

  it("returns an empty array on non-200 response", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("Service Unavailable", { status: 503 });

    const result = await getVoicevoxSpeakers("http://voicevox:50021", fetchImpl);

    assert.deepEqual(result, []);
  });
});
