import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatTempVoiceChannelName,
  formatTempVoiceControlChannelName
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
});
