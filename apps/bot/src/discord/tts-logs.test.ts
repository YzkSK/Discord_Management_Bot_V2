import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTtsMessageSkippedEvent,
  createTtsMessageSpokenEvent,
  createTtsSessionStartedEvent,
  createTtsSessionStoppedEvent
} from "./tts-logs.js";

const now = new Date("2026-05-26T12:00:00.000Z");

describe("tts log events", () => {
  it("creates a session started event for bot voice joins", () => {
    const event = createTtsSessionStartedEvent({
      actorId: "user-1",
      guildId: "guild-1",
      reason: "join-command",
      textChannelId: "text-1",
      voiceChannelId: "voice-1",
      now
    });

    assert.equal(event.eventName, "tts.session.started");
    assert.equal(event.guildId, "guild-1");
    assert.equal(event.actorId, "user-1");
    assert.equal(event.channelId, "voice-1");
    assert.deepEqual(event.payload, {
      reason: "join-command",
      textChannelId: "text-1",
      voiceChannelId: "voice-1"
    });
  });

  it("creates a session stopped event for bot voice leaves", () => {
    const event = createTtsSessionStoppedEvent({
      actorId: "user-1",
      guildId: "guild-1",
      reason: "leave-command",
      voiceChannelId: "voice-1",
      now
    });

    assert.equal(event.eventName, "tts.session.stopped");
    assert.equal(event.channelId, "voice-1");
    assert.deepEqual(event.payload, {
      reason: "leave-command",
      voiceChannelId: "voice-1"
    });
  });

  it("creates a spoken message event without storing message content", () => {
    const event = createTtsMessageSpokenEvent({
      actorId: "user-1",
      guildId: "guild-1",
      sourceChannelId: "text-1",
      sourceMessageId: "message-1",
      sourceType: "temporary",
      speakerId: 2,
      textLength: 12,
      voiceChannelId: "voice-1",
      now
    });

    assert.equal(event.eventName, "tts.message.spoken");
    assert.equal(event.channelId, "text-1");
    assert.equal(event.messageId, "message-1");
    assert.deepEqual(event.payload, {
      sourceChannelId: "text-1",
      sourceMessageId: "message-1",
      sourceType: "temporary",
      speakerId: 2,
      textLength: 12,
      voiceChannelId: "voice-1"
    });
    assert.equal("content" in event.payload, false);
  });

  it("creates a skipped message event without storing message content", () => {
    const event = createTtsMessageSkippedEvent({
      actorId: "user-1",
      guildId: "guild-1",
      reason: "user-muted",
      sourceChannelId: "text-1",
      sourceMessageId: "message-1",
      textLength: 5,
      voiceChannelId: "voice-1",
      now
    });

    assert.equal(event.eventName, "tts.message.skipped");
    assert.deepEqual(event.payload, {
      reason: "user-muted",
      sourceChannelId: "text-1",
      sourceMessageId: "message-1",
      textLength: 5,
      voiceChannelId: "voice-1"
    });
    assert.equal("content" in event.payload, false);
  });
});
