import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkDatabaseHealth } from "./health.js";

describe("checkDatabaseHealth", () => {
  it("runs a lightweight query", async () => {
    let called = false;

    await checkDatabaseHealth({
      execute: async () => {
        called = true;
      }
    });

    assert.equal(called, true);
  });
});
