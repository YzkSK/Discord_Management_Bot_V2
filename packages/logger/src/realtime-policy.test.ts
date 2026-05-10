import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRealtimeEnabled } from "./realtime-policy.js";

describe("resolveRealtimeEnabled", () => {
  it("enables realtime for configured important events", () => {
    assert.equal(resolveRealtimeEnabled("message.update"), true);
    assert.equal(resolveRealtimeEnabled("system.handler.error"), true);
  });

  it("disables realtime for configured high-frequency events", () => {
    assert.equal(resolveRealtimeEnabled("message.create"), false);
    assert.equal(resolveRealtimeEnabled("voice.state.update"), false);
  });

  it("disables unknown events by default", () => {
    assert.equal(resolveRealtimeEnabled("custom.experimental"), false);
  });

  it("honors an explicit override", () => {
    assert.equal(resolveRealtimeEnabled("message.create", { override: true }), true);
    assert.equal(resolveRealtimeEnabled("message.update", { override: false }), false);
  });
});
