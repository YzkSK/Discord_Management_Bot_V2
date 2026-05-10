import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toHandlerErrorLogInput,
  toInsertLogEventInput
} from "./ingestion.js";

const event = {
  eventName: "message.update",
  guildId: "guild-1",
  actorId: "user-1",
  channelId: "channel-1",
  messageId: "message-1",
  eventTimestamp: new Date("2026-05-10T00:00:00.000Z"),
  receivedAt: new Date("2026-05-10T00:00:01.000Z"),
  payload: {
    contentChanged: true
  }
};

describe("toInsertLogEventInput", () => {
  it("maps normalized events to DB insert input", () => {
    const input = toInsertLogEventInput(event);

    assert.deepEqual(input, {
      eventName: "message.update",
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      eventTimestamp: event.eventTimestamp,
      receivedAt: event.receivedAt,
      realtimeEnabled: true,
      payload: {
        contentChanged: true
      }
    });
  });
});

describe("toHandlerErrorLogInput", () => {
  it("creates a realtime system handler error log input", () => {
    const input = toHandlerErrorLogInput({
      event,
      handlerName: "message-log-handler",
      error: new Error("boom"),
      receivedAt: event.receivedAt
    });

    assert.equal(input.eventName, "system.handler.error");
    assert.equal(input.realtimeEnabled, true);
    assert.equal(input.guildId, "guild-1");
    assert.equal(input.payload?.handlerName, "message-log-handler");
    assert.equal(input.payload?.sourceEventName, "message.update");
    assert.deepEqual(input.payload?.error, {
      name: "Error",
      message: "boom",
      stack: (input.payload?.error as { stack?: string }).stack
    });
  });
});
