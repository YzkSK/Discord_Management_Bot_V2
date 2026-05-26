import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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
