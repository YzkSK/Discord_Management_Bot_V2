import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countActiveFilters,
  getDashboardNavItems,
  normalizeGuildId,
  toGuildQueryValue
} from "./dashboard-ui.js";

describe("dashboard ui helpers", () => {
  it("normalizes guild ids for form and query usage", () => {
    assert.equal(normalizeGuildId("  1234567890  "), "1234567890");
    assert.equal(normalizeGuildId(""), "");
    assert.equal(normalizeGuildId("   "), "");
  });

  it("counts only active filters", () => {
    assert.equal(
      countActiveFilters({
        actorId: "42",
        eventName: "",
        guildId: "123",
        search: " temp "
      }),
      3
    );
  });

  it("returns stable dashboard navigation items", () => {
    assert.deepEqual(
      getDashboardNavItems().map((item) => [item.href, item.label]),
      [
        ["/", "Overview"],
        ["/logs", "Logs"],
        ["/settings", "Settings"]
      ]
    );
  });

  it("omits an empty guild query value", () => {
    assert.equal(toGuildQueryValue("  "), null);
    assert.equal(toGuildQueryValue(" 987 "), "987");
  });
});
