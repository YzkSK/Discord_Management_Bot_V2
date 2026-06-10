import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canViewRawLogPayload,
  getLogCategoryTabs,
  getRealtimeStatusMeta
} from "./logs-ui.js";

describe("logs ui helpers", () => {
  it("returns category tabs for the major log domains", () => {
    assert.deepEqual(
      getLogCategoryTabs().map((tab) => [tab.label, tab.eventName]),
      [
        ["All", ""],
        ["Messages", "message"],
        ["Voice", "voice"],
        ["Temp VC", "temp_vc"],
        ["Recruitment", "recruitment"],
        ["Audit", "audit"],
        ["TTS", "tts"],
        ["System", "system"]
      ]
    );
  });

  it("allows raw payload viewing only for admin or owner access", () => {
    assert.equal(canViewRawLogPayload("owner"), true);
    assert.equal(canViewRawLogPayload("admin"), true);
    assert.equal(canViewRawLogPayload("viewer"), false);
    assert.equal(canViewRawLogPayload(null), false);
  });

  it("maps realtime states to display metadata", () => {
    assert.deepEqual(getRealtimeStatusMeta("live"), {
      label: "Live",
      tone: "success"
    });
    assert.deepEqual(getRealtimeStatusMeta("error"), {
      label: "Error",
      tone: "danger"
    });
    assert.deepEqual(getRealtimeStatusMeta("offline"), {
      label: "Offline",
      tone: "muted"
    });
  });
});
