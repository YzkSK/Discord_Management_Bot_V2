import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyTtsDictionaryEntries,
  handleTtsMessage,
  resolveTtsMessageSkipReason,
  resolveTtsMessageSourceType,
  resolveReadableTtsChannelIds,
  sanitizeTtsText,
  shouldReadTtsMessage,
  TtsMessageRateLimiter
} from "./tts-message-reader.js";

describe("shouldReadTtsMessage", () => {
  it("skips bot messages", () => {
    assert.equal(
      shouldReadTtsMessage({
        authorIsBot: true,
        channelId: "text-1",
        content: "hello",
        readableChannelIds: ["text-1"]
      }),
      false
    );
  });

  it("skips messages outside readable channels", () => {
    assert.equal(
      shouldReadTtsMessage({
        authorIsBot: false,
        channelId: "text-2",
        content: "hello",
        readableChannelIds: ["text-1"]
      }),
      false
    );
  });

  it("reads human text inside readable channels", () => {
    assert.equal(
      shouldReadTtsMessage({
        authorIsBot: false,
        channelId: "text-1",
        content: "hello",
        readableChannelIds: ["text-1"]
      }),
      true
    );
  });
});

describe("resolveReadableTtsChannelIds", () => {
  it("does not load persistent config when a temporary source matches", async () => {
    let loaded = false;
    const channels = await resolveReadableTtsChannelIds({
      channelId: "text-1",
      guildId: "guild-1",
      loadPersistentTextChannelId: async () => {
        loaded = true;
        return "text-2";
      },
      temporaryChannelIds: ["text-1"]
    });

    assert.deepEqual(channels, ["text-1"]);
    assert.equal(loaded, false);
  });

  it("loads persistent config when temporary sources do not match", async () => {
    const channels = await resolveReadableTtsChannelIds({
      channelId: "text-2",
      guildId: "guild-1",
      loadPersistentTextChannelId: async () => "text-2",
      temporaryChannelIds: ["text-1"]
    });

    assert.deepEqual(channels, ["text-1", "text-2"]);
  });
});

describe("resolveTtsMessageSourceType", () => {
  it("prefers temporary sources when the channel was added by join", () => {
    assert.equal(
      resolveTtsMessageSourceType({
        channelId: "text-1",
        temporaryChannelIds: ["text-1"]
      }),
      "temporary"
    );
  });

  it("uses configured sources otherwise", () => {
    assert.equal(
      resolveTtsMessageSourceType({
        channelId: "text-2",
        temporaryChannelIds: ["text-1"]
      }),
      "configured"
    );
  });
});

describe("resolveTtsMessageSkipReason", () => {
  it("does not log bot-authored skipped messages", () => {
    assert.equal(
      resolveTtsMessageSkipReason({ authorIsBot: true, content: "hello" }),
      null
    );
  });

  it("classifies empty messages", () => {
    assert.equal(
      resolveTtsMessageSkipReason({ authorIsBot: false, content: "  " }),
      "empty"
    );
  });

  it("classifies slash-command-like messages", () => {
    assert.equal(
      resolveTtsMessageSkipReason({ authorIsBot: false, content: "/join" }),
      "command-like"
    );
  });

  it("classifies double-slash messages as user-muted", () => {
    assert.equal(
      resolveTtsMessageSkipReason({
        authorIsBot: false,
        content: "//これは読み上げない"
      }),
      "user-muted"
    );
  });

  it("classifies messages beyond the TTS length limit", () => {
    assert.equal(
      resolveTtsMessageSkipReason({
        authorIsBot: false,
        content: "a".repeat(121)
      }),
      "too-long"
    );
  });
});

describe("applyTtsDictionaryEntries", () => {
  it("applies partial replacements in the provided priority order", () => {
    assert.equal(
      applyTtsDictionaryEntries("AIでVCに入る", [
        {
          fromText: "AI",
          isEnabled: true,
          priority: 10,
          scope: "user",
          toText: "えーあい"
        },
        {
          fromText: "VC",
          isEnabled: true,
          priority: 1,
          scope: "guild",
          toText: "ボイスチャンネル"
        }
      ]),
      "えーあいでボイスチャンネルに入る"
    );
  });

  it("lets user dictionary entries win when they are ordered before guild entries", () => {
    assert.equal(
      applyTtsDictionaryEntries("APIを使う", [
        {
          fromText: "API",
          isEnabled: true,
          priority: 5,
          scope: "user",
          toText: "えーぴーあい"
        },
        {
          fromText: "API",
          isEnabled: true,
          priority: 100,
          scope: "guild",
          toText: "あぴ"
        }
      ]),
      "えーぴーあいを使う"
    );
  });

  it("treats dictionary keys as literal text instead of regex patterns", () => {
    assert.equal(
      applyTtsDictionaryEntries("a.b axb", [
        {
          fromText: "a.b",
          isEnabled: true,
          priority: 1,
          scope: "guild",
          toText: "dot"
        }
      ]),
      "dot axb"
    );
  });

  it("limits replacement count to avoid dictionary loops and runaway output", () => {
    assert.equal(
      applyTtsDictionaryEntries(
        "aaaa",
        [
          {
            fromText: "a",
            isEnabled: true,
            priority: 1,
            scope: "guild",
            toText: "aa"
          }
        ],
        { maxReplacements: 2 }
      ),
      "aaaaaa"
    );
  });
});

describe("sanitizeTtsText", () => {
  it("removes URLs and Discord mentions from readable text", () => {
    assert.equal(
      sanitizeTtsText("見て https://example.com <@123> <#456> ok"),
      "見て ok"
    );
  });
});

describe("TtsMessageRateLimiter", () => {
  it("blocks bursts from the same guild and user within the window", () => {
    const limiter = new TtsMessageRateLimiter({
      maxMessages: 2,
      windowMs: 1_000
    });

    assert.equal(
      limiter.allow({ guildId: "guild-1", now: 1_000, userId: "user-1" }),
      true
    );
    assert.equal(
      limiter.allow({ guildId: "guild-1", now: 1_100, userId: "user-1" }),
      true
    );
    assert.equal(
      limiter.allow({ guildId: "guild-1", now: 1_200, userId: "user-1" }),
      false
    );
    assert.equal(
      limiter.allow({ guildId: "guild-1", now: 2_100, userId: "user-1" }),
      true
    );
  });
});

describe("handleTtsMessage", () => {
  it("passes dictionary-applied text to VOICEVOX", async () => {
    let synthesizedText = "";
    let synthesizedSpeakerId = 0;

    await handleTtsMessage(
      {
        author: { bot: false, id: "user-1" },
        channelId: "text-1",
        content: "APIを読む",
        guildId: "guild-1",
        id: "message-1",
        inGuild: () => true
      } as never,
      {
        db: {} as never,
        loadDictionaryEntries: async (input) => {
          assert.deepEqual(input, { guildId: "guild-1", userId: "user-1" });
          return [
            {
              fromText: "API",
              isEnabled: true,
              priority: 1,
              scope: "user",
              toText: "えーぴーあい"
            }
          ];
        },
        loadSpeakerId: async (input) => {
          assert.deepEqual(input, {
            fallbackSpeakerId: 1,
            guildId: "guild-1",
            userId: "user-1"
          });
          return 5;
        },
        logWriter: {
          recordHandlerError: async () => undefined,
          write: async () => undefined
        },
        speakerId: 1,
        ttsSessionManager: {
          getReadableChannelIds: () => ["text-1"],
          getVoiceChannelId: () => "voice-1",
          isConnected: () => true,
          play: async () => undefined
        } as never,
        voicevox: {
          synthesize: async (text, speakerId) => {
            synthesizedText = text;
            synthesizedSpeakerId = speakerId ?? 0;
            return Buffer.from("audio");
          }
        }
      }
    );

    assert.equal(synthesizedText, "えーぴーあいを読む");
    assert.equal(synthesizedSpeakerId, 5);
  });

  it("skips messages when the rate limiter blocks the user", async () => {
    let synthesized = false;
    let skippedReason = "";

    await handleTtsMessage(
      {
        author: { bot: false, id: "user-1" },
        channelId: "text-1",
        content: "hello",
        guildId: "guild-1",
        id: "message-1",
        inGuild: () => true
      } as never,
      {
        db: {} as never,
        loadDictionaryEntries: async () => [],
        logWriter: {
          recordHandlerError: async () => undefined,
          write: async (event) => {
            skippedReason = String(event.payload.reason);
          }
        },
        rateLimiter: {
          allow: () => false
        },
        speakerId: 1,
        ttsSessionManager: {
          getReadableChannelIds: () => ["text-1"],
          getVoiceChannelId: () => "voice-1",
          isConnected: () => true,
          play: async () => undefined
        } as never,
        voicevox: {
          synthesize: async () => {
            synthesized = true;
            return Buffer.from("audio");
          }
        }
      }
    );

    assert.equal(synthesized, false);
    assert.equal(skippedReason, "rate-limited");
  });
});
