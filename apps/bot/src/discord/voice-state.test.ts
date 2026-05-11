import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type VoiceStateSnapshot,
  toVoiceStateTransition
} from "./voice-state.js";

const baseState: VoiceStateSnapshot = {
  guildId: "guild-1",
  userId: "user-1",
  channelId: null,
  memberIsBot: false
};

describe("toVoiceStateTransition", () => {
  it("detects a join", () => {
    const transition = toVoiceStateTransition(baseState, {
      ...baseState,
      channelId: "voice-1"
    });

    assert.equal(transition?.type, "join");
    assert.equal(transition?.newChannelId, "voice-1");
  });

  it("detects a leave", () => {
    const transition = toVoiceStateTransition(
      { ...baseState, channelId: "voice-1" },
      baseState
    );

    assert.equal(transition?.type, "leave");
    assert.equal(transition?.oldChannelId, "voice-1");
  });

  it("detects a move", () => {
    const transition = toVoiceStateTransition(
      { ...baseState, channelId: "voice-1" },
      { ...baseState, channelId: "voice-2" }
    );

    assert.equal(transition?.type, "move");
    assert.equal(transition?.oldChannelId, "voice-1");
    assert.equal(transition?.newChannelId, "voice-2");
  });

  it("ignores unchanged channel state", () => {
    const transition = toVoiceStateTransition(
      { ...baseState, channelId: "voice-1" },
      { ...baseState, channelId: "voice-1" }
    );

    assert.equal(transition, null);
  });

  it("ignores mismatched users", () => {
    const transition = toVoiceStateTransition(baseState, {
      ...baseState,
      userId: "user-2",
      channelId: "voice-1"
    });

    assert.equal(transition, null);
  });
});
