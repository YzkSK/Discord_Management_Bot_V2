import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NormalizedEvent } from "@discord-bot/shared";

import {
  appendLogChannelMarker,
  formatLogEventLines,
  formatLogEventTitle,
  hasLogChannelMarker,
  logChannelTopicMarker
} from "./log-channel.js";

describe("log channel marker", () => {
  it("detects marked channel topics", () => {
    assert.equal(hasLogChannelMarker(logChannelTopicMarker), true);
    assert.equal(hasLogChannelMarker("general logs"), false);
    assert.equal(hasLogChannelMarker(null), false);
  });

  it("appends the marker without dropping an existing topic", () => {
    assert.equal(
      appendLogChannelMarker("existing topic"),
      `existing topic\n${logChannelTopicMarker}`
    );
  });

  it("does not duplicate the marker", () => {
    assert.equal(
      appendLogChannelMarker(logChannelTopicMarker),
      logChannelTopicMarker
    );
  });
});

describe("log event formatting", () => {
  it("formats a message event for Discord delivery", () => {
    const event: NormalizedEvent = {
      eventName: "message.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: {
        content: "hello"
      }
    };

    assert.equal(formatLogEventTitle(event.eventName), "Log: message.create");
    assert.deepEqual(formatLogEventLines(event), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: 2026-05-12T00:00:00.000Z",
      "Content: hello"
    ]);
  });

  it("formats a non-message payload for Discord delivery", () => {
    const event: NormalizedEvent = {
      eventName: "role.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: null,
      channelId: null,
      messageId: null,
      payload: {
        role: {
          id: "role-1",
          name: "Admin"
        }
      }
    };

    assert.deepEqual(formatLogEventLines(event), [
      "Actor: unknown",
      "Channel: unknown",
      "Message ID: unknown",
      "Event time: 2026-05-12T00:00:00.000Z",
      'Details: {"role":{"id":"role-1","name":"Admin"}}'
    ]);
  });
});
