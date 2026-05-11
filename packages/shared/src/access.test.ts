import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasDashboardAccessRole, maxDashboardAccessRole } from "./access.js";

describe("hasDashboardAccessRole", () => {
  it("allows higher roles to satisfy lower requirements", () => {
    assert.equal(hasDashboardAccessRole("owner", "viewer"), true);
    assert.equal(hasDashboardAccessRole("owner", "admin"), true);
    assert.equal(hasDashboardAccessRole("admin", "viewer"), true);
  });

  it("blocks lower roles from satisfying higher requirements", () => {
    assert.equal(hasDashboardAccessRole("viewer", "admin"), false);
    assert.equal(hasDashboardAccessRole("admin", "owner"), false);
  });

  it("blocks missing roles", () => {
    assert.equal(hasDashboardAccessRole(null, "viewer"), false);
    assert.equal(hasDashboardAccessRole(undefined, "viewer"), false);
  });
});

describe("maxDashboardAccessRole", () => {
  it("returns the highest role", () => {
    assert.equal(maxDashboardAccessRole(["viewer", "admin"]), "admin");
    assert.equal(maxDashboardAccessRole(["viewer", "owner", "admin"]), "owner");
  });

  it("ignores missing roles", () => {
    assert.equal(maxDashboardAccessRole([null, undefined, "viewer"]), "viewer");
  });

  it("returns null without roles", () => {
    assert.equal(maxDashboardAccessRole([null, undefined]), null);
  });
});
