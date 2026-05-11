import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTempVoiceChannelName } from "./temp-voice.js";

describe("formatTempVoiceChannelName", () => {
  it("formats the generated temp voice channel name", () => {
    assert.equal(formatTempVoiceChannelName("Yuzuki"), "🎮 Yuzuki");
  });
});
