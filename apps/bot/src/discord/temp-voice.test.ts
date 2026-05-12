import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatTempVoiceChannelName,
  formatTempVoiceControlChannelName
} from "./temp-voice.js";

describe("formatTempVoiceChannelName", () => {
  it("formats the generated temp voice channel name", () => {
    assert.equal(formatTempVoiceChannelName("Yuzuki"), "🎮 Yuzuki");
  });

  it("formats the generated control channel name", () => {
    assert.equal(
      formatTempVoiceControlChannelName("Yuzuki"),
      "control-🎮 Yuzuki"
    );
  });
});
