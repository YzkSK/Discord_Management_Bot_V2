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

describe("installVoiceStateHandlers multi-guild", () => {
  it("tracks the same user joining different guilds as independent events", async () => {
    const transitions: { type: string; guildId: string }[] = [];
    const mockClient = new EventEmitter();
    installVoiceStateHandlers(mockClient as unknown as Client, {
      onTransition: async (transition) => {
        transitions.push({ type: transition.type, guildId: transition.guildId });
      }
    });

    mockClient.emit("voiceStateUpdate", makeVoiceState("guild-1", "user-1", null), makeVoiceState("guild-1", "user-1", "voice-1"));
    mockClient.emit("voiceStateUpdate", makeVoiceState("guild-2", "user-1", null), makeVoiceState("guild-2", "user-1", "voice-2"));

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    assert.equal(transitions.length, 2);
    const g1 = transitions.find((t) => t.guildId === "guild-1");
    const g2 = transitions.find((t) => t.guildId === "guild-2");
    assert.equal(g1?.type, "join");
    assert.equal(g2?.type, "join");
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
