import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOGS_STREAM_KEY,
  REALTIME_LOGS_STREAM_PREFIX,
  appendLogEventToStream,
  appendRealtimeLogEventToStream,
  toLogStreamFields
} from "./log-stream.js";

const event = {
  eventName: "message.update",
  guildId: "guild-1",
  actorId: "user-1",
  channelId: "channel-1",
  messageId: "message-1",
  eventTimestamp: new Date("2026-05-10T00:00:00.000Z"),
  receivedAt: new Date("2026-05-10T00:00:01.000Z"),
  payload: {
    before: "hello",
    after: "hello!"
  }
};

describe("toLogStreamFields", () => {
  it("serializes a normalized event for Redis Stream fields", () => {
    assert.deepEqual(toLogStreamFields(event, { realtimeEnabled: true }), {
      event_name: "message.update",
      guild_id: "guild-1",
      actor_id: "user-1",
      channel_id: "channel-1",
      message_id: "message-1",
      event_timestamp: "2026-05-10T00:00:00.000Z",
      received_at: "2026-05-10T00:00:01.000Z",
      realtime_enabled: "1",
      payload: JSON.stringify({
        before: "hello",
        after: "hello!"
      })
    });
  });
});

describe("appendLogEventToStream", () => {
  it("appends to the durable logs stream", async () => {
    const writes: Array<{ key: string; fields: Record<string, string> }> = [];
    const id = await appendLogEventToStream(
      {
        async xAdd(key, _id, fields) {
          writes.push({ key, fields });
          return "1-0";
        }
      },
      event
    );

    assert.equal(id, "1-0");
    assert.equal(writes[0]?.key, LOGS_STREAM_KEY);
  });
});

describe("appendRealtimeLogEventToStream", () => {
  it("appends to the guild realtime stream when guild id exists", async () => {
    const writes: Array<{ key: string; fields: Record<string, string> }> = [];
    const id = await appendRealtimeLogEventToStream(
      {
        async xAdd(key, _id, fields) {
          writes.push({ key, fields });
          return "2-0";
        }
      },
      event,
      { realtimeEnabled: true }
    );

    assert.equal(id, "2-0");
    assert.equal(writes[0]?.key, `${REALTIME_LOGS_STREAM_PREFIX}guild-1`);
    assert.equal(writes[0]?.fields.realtime_enabled, "1");
  });

  it("skips realtime stream writes without a guild id", async () => {
    const id = await appendRealtimeLogEventToStream(
      {
        async xAdd() {
          throw new Error("xAdd should not be called");
        }
      },
      {
        ...event,
        guildId: null
      }
    );

    assert.equal(id, null);
  });
});
