import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldAutoLeaveTtsChannel } from "./tts-auto-leave.js";

describe("shouldAutoLeaveTtsChannel", () => {
  it("disconnects when the connected voice channel has no human members", () => {
    assert.equal(
      shouldAutoLeaveTtsChannel({
        connectedVoiceChannelId: "voice-1",
        oldChannelId: "voice-1",
        transitionType: "leave",
        remainingMembers: [{ bot: true }]
      }),
      true
    );
  });

  it("keeps TTS connected while any human remains", () => {
    assert.equal(
      shouldAutoLeaveTtsChannel({
        connectedVoiceChannelId: "voice-1",
        oldChannelId: "voice-1",
        transitionType: "move",
        remainingMembers: [{ bot: true }, { bot: false }]
      }),
      false
    );
  });

  it("ignores transitions outside the connected voice channel", () => {
    assert.equal(
      shouldAutoLeaveTtsChannel({
        connectedVoiceChannelId: "voice-2",
        oldChannelId: "voice-1",
        transitionType: "leave",
        remainingMembers: []
      }),
      false
    );
  });
});
