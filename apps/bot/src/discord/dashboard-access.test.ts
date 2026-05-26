import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasDashboardAdminCommandAccess,
  resolveDashboardCommandAccessRole
} from "./dashboard-access.js";

describe("resolveDashboardCommandAccessRole", () => {
  it("treats the guild owner as owner", () => {
    assert.equal(
      resolveDashboardCommandAccessRole({
        grants: [],
        isGuildOwner: true
      }),
      "owner"
    );
  });

  it("allows admin user grants", () => {
    const role = resolveDashboardCommandAccessRole({
      grants: [{ role: "admin", targetType: "user" }],
      isGuildOwner: false
    });

    assert.equal(role, "admin");
    assert.equal(hasDashboardAdminCommandAccess(role), true);
  });

  it("allows admin role grants", () => {
    const role = resolveDashboardCommandAccessRole({
      grants: [{ role: "admin", targetType: "role" }],
      isGuildOwner: false
    });

    assert.equal(role, "admin");
    assert.equal(hasDashboardAdminCommandAccess(role), true);
  });

  it("rejects viewer grants for admin commands", () => {
    const role = resolveDashboardCommandAccessRole({
      grants: [{ role: "viewer", targetType: "user" }],
      isGuildOwner: false
    });

    assert.equal(role, "viewer");
    assert.equal(hasDashboardAdminCommandAccess(role), false);
  });
});
