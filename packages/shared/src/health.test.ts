import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizeHealthChecks } from "./health.js";

describe("health helpers", () => {
  it("returns ok when every dependency is healthy", () => {
    assert.equal(
      summarizeHealthChecks({
        database: { status: "ok" },
        redis: { status: "ok" },
        voicevox: { status: "ok" }
      }),
      "ok"
    );
  });

  it("returns error when any dependency is unhealthy", () => {
    assert.equal(
      summarizeHealthChecks({
        database: { status: "ok" },
        redis: { status: "error", message: "Redis ping failed." },
        voicevox: { status: "ok" }
      }),
      "error"
    );
  });
});
