import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTempVoiceOwnerTransferredEvent,
  formatTempVoiceChannelName,
  formatTempVoiceControlChannelName,
  selectNextTempVoiceOwner
} from "./temp-voice.js";
import {
  isTempVoiceAuditReason,
  shouldSuppressTempVoiceChannelLog,
  suppressTempVoiceChannelLog,
  tempVoiceControlCreateReason,
  tempVoiceCreateReason,
  tempVoiceDeleteReason
} from "./temp-voice-log-suppression.js";

describe("formatTempVoiceChannelName", () => {
  it("formats the generated temp voice channel name", () => {
    assert.equal(formatTempVoiceChannelName("Yuzuki"), "🎮 Yuzuki");
  });

  it("formats the generated control channel name", () => {
    assert.equal(
      formatTempVoiceControlChannelName("Yuzuki"),
      "control-🎮 Yuzuki"
    );
  });
  it("detects temp voice audit reasons for generic log suppression", () => {
    assert.equal(isTempVoiceAuditReason(tempVoiceCreateReason), true);
    assert.equal(isTempVoiceAuditReason(tempVoiceControlCreateReason), true);
    assert.equal(isTempVoiceAuditReason(tempVoiceDeleteReason), true);
    assert.equal(isTempVoiceAuditReason("regular channel change"), false);
    assert.equal(isTempVoiceAuditReason(null), false);
  });

  it("suppresses a temp voice channel log once", () => {
    suppressTempVoiceChannelLog("channel-1");

    assert.equal(shouldSuppressTempVoiceChannelLog("channel-1"), true);
    assert.equal(shouldSuppressTempVoiceChannelLog("channel-1"), false);
  });

  it("expires temp voice channel log suppression", () => {
    suppressTempVoiceChannelLog("channel-2", -1);

    assert.equal(shouldSuppressTempVoiceChannelLog("channel-2"), false);
  });

  it("selects the earliest active non-current owner as next Temp VC owner", () => {
    const nextOwner = selectNextTempVoiceOwner(
      [
        {
          joinOrder: 0,
          joinedAt: new Date("2026-06-02T00:00:00.000Z"),
          userId: "owner-1"
        },
        {
          joinOrder: 1,
          joinedAt: new Date("2026-06-02T00:00:01.000Z"),
          userId: "user-2"
        },
        {
          joinOrder: 2,
          joinedAt: new Date("2026-06-02T00:00:01.000Z"),
          userId: "user-3"
        }
      ],
      "owner-1"
    );

    assert.equal(nextOwner?.userId, "user-2");
  });

  it("creates a Temp VC owner transferred log event", () => {
    const event = createTempVoiceOwnerTransferredEvent({
      callSessionId: "call-1",
      channelId: "voice-1",
      controlChannelId: "control-1",
      guildId: "guild-1",
      nextOwnerId: "user-2",
      previousOwnerId: "owner-1",
      tempVoiceChannelName: "Room"
    });

    assert.equal(event.eventName, "voice.temp.owner_transferred");
    assert.equal(event.actorId, "user-2");
    assert.deepEqual(event.payload, {
      callSessionId: "call-1",
      controlChannelId: "control-1",
      nextOwnerId: "user-2",
      previousOwnerId: "owner-1",
      tempVoiceChannelId: "voice-1",
      tempVoiceChannelName: "Room"
    });
  });
});
