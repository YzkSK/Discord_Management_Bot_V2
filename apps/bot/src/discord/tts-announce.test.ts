import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAnnounceAction } from "./tts-announce.js";

describe("resolveAnnounceAction", () => {
  it("returns 'join' when user enters the TTS voice channel", () => {
    assert.equal(
      resolveAnnounceAction({
        connectedVoiceChannelId: "vc-1",
        oldChannelId: null,
        newChannelId: "vc-1"
      }),
      "join"
    );
  });

  it("returns 'join' when user moves from another channel into the TTS voice channel", () => {
    assert.equal(
      resolveAnnounceAction({
        connectedVoiceChannelId: "vc-1",
        oldChannelId: "vc-2",
        newChannelId: "vc-1"
      }),
      "join"
    );
  });

  it("returns 'leave' when user leaves the TTS voice channel", () => {
    assert.equal(
      resolveAnnounceAction({
        connectedVoiceChannelId: "vc-1",
        oldChannelId: "vc-1",
        newChannelId: null
      }),
      "leave"
    );
  });

  it("returns 'leave' when user moves away from the TTS voice channel", () => {
    assert.equal(
      resolveAnnounceAction({
        connectedVoiceChannelId: "vc-1",
        oldChannelId: "vc-1",
        newChannelId: "vc-2"
      }),
      "leave"
    );
  });

  it("returns null when there is no active TTS session", () => {
    assert.equal(
      resolveAnnounceAction({
        connectedVoiceChannelId: null,
        oldChannelId: "vc-1",
        newChannelId: "vc-2"
      }),
      null
    );
  });

  it("returns null when neither channel is the TTS voice channel", () => {
    assert.equal(
      resolveAnnounceAction({
        connectedVoiceChannelId: "vc-3",
        oldChannelId: "vc-1",
        newChannelId: "vc-2"
      }),
      null
    );
  });
});
