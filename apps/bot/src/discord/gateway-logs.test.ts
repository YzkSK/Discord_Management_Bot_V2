import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveVoiceStateLogEventName,
  shouldSkipVoiceStateLog
} from "./gateway-logs.js";

describe("resolveVoiceStateLogEventName", () => {
  it("detects voice joins", () => {
    assert.equal(
      resolveVoiceStateLogEventName(
        { channelId: null } as never,
        { channelId: "voice-1" } as never
      ),
      "voice.session.join"
    );
  });

  it("detects voice leaves", () => {
    assert.equal(
      resolveVoiceStateLogEventName(
        { channelId: "voice-1" } as never,
        { channelId: null } as never
      ),
      "voice.session.leave"
    );
  });

  it("detects voice moves", () => {
    assert.equal(
      resolveVoiceStateLogEventName(
        { channelId: "voice-1" } as never,
        { channelId: "voice-2" } as never
      ),
      "voice.session.move"
    );
  });

  it("detects in-channel voice state updates", () => {
    assert.equal(
      resolveVoiceStateLogEventName(
        { channelId: "voice-1" } as never,
        { channelId: "voice-1" } as never
      ),
      "voice.state.update"
    );
  });
});

describe("shouldSkipVoiceStateLog", () => {
  it("skips bot voice joins", () => {
    assert.equal(
      shouldSkipVoiceStateLog({
        eventName: "voice.session.join",
        memberIsBot: true
      }),
      true
    );
  });

  it("skips bot voice leaves", () => {
    assert.equal(
      shouldSkipVoiceStateLog({
        eventName: "voice.session.leave",
        memberIsBot: true
      }),
      true
    );
  });

  it("keeps human voice joins", () => {
    assert.equal(
      shouldSkipVoiceStateLog({
        eventName: "voice.session.join",
        memberIsBot: false
      }),
      false
    );
  });

  it("keeps bot voice moves for now", () => {
    assert.equal(
      shouldSkipVoiceStateLog({
        eventName: "voice.session.move",
        memberIsBot: true
      }),
      false
    );
  });
});
