import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveTtsMessageSkipReason,
  resolveTtsMessageSourceType,
  resolveReadableTtsChannelIds,
  shouldReadTtsMessage
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
