import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countActiveFilters,
  dashboardGuildStorageKey,
  getDashboardEventPresets,
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
        ["/voice", "Voice"],
        ["/recruitment", "Recruitment"],
        ["/logs", "Logs"],
        ["/settings", "Settings"]
      ]
    );
  });

  it("omits an empty guild query value", () => {
    assert.equal(toGuildQueryValue("  "), null);
    assert.equal(toGuildQueryValue(" 987 "), "987");
  });

  it("uses a stable storage key for selected guild", () => {
    assert.equal(dashboardGuildStorageKey, "discord-bot-dashboard:guild-id");
  });

  it("returns event presets for log verification workflows", () => {
    assert.deepEqual(
      getDashboardEventPresets().map((preset) => [
        preset.label,
        preset.eventName
      ]),
      [
        ["All", ""],
        ["Messages", "message"],
        ["Voice", "voice"],
        ["Temp VC", "temp_vc"],
        ["Recruitment", "recruitment"],
        ["Audit", "audit"]
      ]
    );
  });
});
