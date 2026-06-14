import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getLocale } from "@discord-bot/shared";
import type { NormalizedEvent } from "@discord-bot/shared";

import {
  appendLogChannelMarker,
  formatLogEventLines,
  formatLogEventTitle,
  hasLogChannelMarker,
  logChannelTopicMarker
} from "./log-channel.js";

const enLoc = getLocale("en");
const jaLoc = getLocale("ja");

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

describe("log event formatting (en)", () => {
  it("formats a message event for Discord delivery", () => {
    const event: NormalizedEvent = {
      eventName: "message.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "hello" }
    };

    assert.equal(formatLogEventTitle(event.eventName, enLoc), "✉️ Message Created");
    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>",
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
      payload: { role: { id: "role-1", name: "Admin" } }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: unknown",
      "Channel: unknown",
      "Event time: <t:1778544000:f>",
    ]);
  });

  it("omits content line for message.create with no text content (attachment-only)", () => {
    const event: NormalizedEvent = {
      eventName: "message.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "" }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>"
    ]);
  });

  it("shows before/after for message.update", () => {
    const event: NormalizedEvent = {
      eventName: "message.update",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "new text", oldContent: "old text", newContent: "new text" }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>",
      "Content: old text → new text"
    ]);
  });

  it("shows dash for null oldContent on message.update", () => {
    const event: NormalizedEvent = {
      eventName: "message.update",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "new text", oldContent: null, newContent: "new text" }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>",
      "Content: – → new text"
    ]);
  });

  it("omits content line for message.delete when content is null (partial)", () => {
    const event: NormalizedEvent = {
      eventName: "message.delete",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: null }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>"
    ]);
  });

  it("omits content line for message.update when both oldContent and newContent are null (embed unfurl)", () => {
    const event: NormalizedEvent = {
      eventName: "message.update",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "some text", oldContent: null, newContent: null }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>"
    ]);
  });

  it("formats a temp voice event with the channel name", () => {
    const event: NormalizedEvent = {
      eventName: "voice.temp.deleted",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "deleted-channel-1",
      messageId: null,
      payload: {
        tempVoiceChannelId: "deleted-channel-1",
        tempVoiceChannelName: "\u{1F3AE} Yuzuki"
      }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: \u{1F3AE} Yuzuki",
      "Event time: <t:1778544000:f>",
    ]);
  });
});

describe("log event formatting (ja)", () => {
  it("formats a message event in Japanese", () => {
    const event: NormalizedEvent = {
      eventName: "message.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "hello" }
    };

    assert.equal(formatLogEventTitle(event.eventName, jaLoc), "✉️ メッセージ送信");
    assert.deepEqual(formatLogEventLines(event, jaLoc), [
      "アクター: <@user-1>",
      "チャンネル: <#channel-1>",
      "メッセージID: message-1",
      "イベント時刻: <t:1778544000:f>",
      "内容: hello"
    ]);
  });

  it("formats a non-message payload in Japanese", () => {
    const event: NormalizedEvent = {
      eventName: "role.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: null,
      channelId: null,
      messageId: null,
      payload: { role: { id: "role-1", name: "Admin" } }
    };

    assert.deepEqual(formatLogEventLines(event, jaLoc), [
      "アクター: 不明",
      "チャンネル: 不明",
      "イベント時刻: <t:1778544000:f>",
    ]);
  });
});
