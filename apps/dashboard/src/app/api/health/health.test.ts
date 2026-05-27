import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHealthReport, toHealthHttpStatus } from "./health.js";

describe("dashboard health helpers", () => {
  it("returns 200 for ok reports", () => {
    assert.equal(toHealthHttpStatus("ok"), 200);
  });

  it("returns 503 for error reports", () => {
    assert.equal(toHealthHttpStatus("error"), 503);
  });

  it("summarizes dependency probes into a report", async () => {
    const report = await createHealthReport({
      checkedAt: new Date("2026-05-27T00:00:00.000Z"),
      probes: {
        database: async () => ({ status: "ok" }),
        redis: async () => ({ status: "error", message: "Redis ping failed." })
      }
    });

    assert.deepEqual(report, {
      status: "error",
      checkedAt: "2026-05-27T00:00:00.000Z",
      checks: {
        database: { status: "ok" },
        redis: { status: "error", message: "Redis ping failed." }
      }
    });
  });
});
