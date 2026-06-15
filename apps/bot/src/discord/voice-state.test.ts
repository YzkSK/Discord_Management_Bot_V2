import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";

import type { Client, VoiceState } from "discord.js";

import {
  installVoiceStateHandlers,
  type VoiceStateSnapshot,
  toVoiceStateTransition
} from "./voice-state.js";

function makeVoiceState(guildId: string, userId: string, channelId: string | null): VoiceState {
  return {
    guild: { id: guildId },
    id: userId,
    channelId,
    channel: channelId ? { id: channelId } : null,
    member: { user: { bot: false } }
  } as unknown as VoiceState;
}

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

describe("installVoiceStateHandlers move serialization", () => {
  it("serializes leave-from-destination after move (zombie session prevention)", async () => {
    const callOrder: string[] = [];
    let resolveMoveBlock!: () => void;
    const moveBlock = new Promise<void>((r) => { resolveMoveBlock = r; });

    const mockClient = new EventEmitter();
    installVoiceStateHandlers(mockClient as unknown as Client, {
      onTransition: async (transition) => {
        if (transition.type === "move") {
          callOrder.push("move-start");
          await moveBlock;
          callOrder.push("move-end");
        } else if (transition.type === "leave") {
          callOrder.push("leave");
        }
      }
    });

    const G = "guild-1";
    const U = "user-1";

    // Emit move A→B, then immediately leave B→∅
    mockClient.emit("voiceStateUpdate", makeVoiceState(G, U, "ch-a"), makeVoiceState(G, U, "ch-b"));
    mockClient.emit("voiceStateUpdate", makeVoiceState(G, U, "ch-b"), makeVoiceState(G, U, null));

    // Yield so both events are enqueued
    await new Promise((r) => setImmediate(r));
    // move has started but is blocked; leave should not have started yet
    assert.deepEqual(callOrder, ["move-start"]);

    // Unblock the move
    resolveMoveBlock();
    // Wait for both handlers to drain
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    assert.deepEqual(callOrder, ["move-start", "move-end", "leave"]);
  });
});
