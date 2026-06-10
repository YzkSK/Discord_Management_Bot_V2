import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHealthSummary } from "./summary.js";

describe("buildHealthSummary", () => {
  it("summarizes dependency health and error counts", () => {
    const summary = buildHealthSummary({
      checkedAt: "2026-06-11T01:02:03.000Z",
      status: "error",
      checks: {
        database: { status: "ok", latencyMs: 12 },
        redis: { status: "error", latencyMs: 41, message: "ECONNREFUSED" },
        voicevox: { status: "ok", latencyMs: 83 }
      }
    });

    assert.equal(summary.status, "error");
    assert.equal(summary.totalChecks, 3);
    assert.equal(summary.okCount, 2);
    assert.equal(summary.errorCount, 1);
    assert.equal(summary.lastCheckedAt, "2026-06-11T01:02:03.000Z");
    assert.deepEqual(
      summary.services.map((service) => [
        service.name,
        service.status,
        service.latencyMs,
        service.message
      ]),
      [
        ["database", "ok", 12, null],
        ["redis", "error", 41, "ECONNREFUSED"],
        ["voicevox", "ok", 83, null]
      ]
    );
  });
});
