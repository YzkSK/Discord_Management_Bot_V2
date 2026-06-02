import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendVoiceStatusChannelMarker,
  createVoiceStatusMessage,
  hasVoiceStatusChannelMarker,
  resolveVoiceStatusDisplayState,
  voiceStatusChannelTopicMarker
} from "./voice-status-channel.js";

describe("voice status channel marker", () => {
  it("detects marked channel topics", () => {
    assert.equal(
      hasVoiceStatusChannelMarker(
        `existing topic\n${voiceStatusChannelTopicMarker}`
      ),
      true
    );
    assert.equal(hasVoiceStatusChannelMarker("existing topic"), false);
  });

  it("appends the marker without dropping an existing topic", () => {
    assert.equal(
      appendVoiceStatusChannelMarker("existing topic"),
      `existing topic\n${voiceStatusChannelTopicMarker}`
    );
  });
});

describe("voice status display", () => {
  it("shows started before the first minute passes", () => {
    assert.equal(
      resolveVoiceStatusDisplayState({
        now: new Date("2026-06-03T00:00:59.000Z"),
        startedAt: new Date("2026-06-03T00:00:00.000Z")
      }),
      "started"
    );
  });

  it("shows active after one minute passes", () => {
    assert.equal(
      resolveVoiceStatusDisplayState({
        now: new Date("2026-06-03T00:01:00.000Z"),
        startedAt: new Date("2026-06-03T00:00:00.000Z")
      }),
      "active"
    );
  });

  it("shows ended even when the call lasted less than one minute", () => {
    assert.equal(
      resolveVoiceStatusDisplayState({
        endedAt: new Date("2026-06-03T00:00:30.000Z"),
        now: new Date("2026-06-03T00:00:30.000Z"),
        startedAt: new Date("2026-06-03T00:00:00.000Z")
      }),
      "ended"
    );
  });

  it("renders duration in the status message", () => {
    const message = createVoiceStatusMessage({
      channelId: "voice-1",
      endedAt: new Date("2026-06-03T00:02:30.000Z"),
      memberCount: 0,
      now: new Date("2026-06-03T00:02:30.000Z"),
      sessionId: "session-1",
      startedAt: new Date("2026-06-03T00:00:00.000Z")
    });
    const serialized = JSON.stringify(message);

    assert.match(serialized, /Ended/);
    assert.match(serialized, /Duration: 2m 30s/);
    assert.match(serialized, /Voice channel: <#voice-1>/);
  });
});
