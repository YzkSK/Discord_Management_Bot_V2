import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  removeAccessGrant,
  toAccessGrantPayload,
  upsertAccessGrant
} from "./access-grants.js";

const baseGrant = {
  id: "grant-1",
  guildId: "guild-1",
  targetType: "user" as const,
  targetId: "user-1",
  role: "viewer" as const,
  createdAt: "2026-05-29T00:00:00.000Z",
  updatedAt: "2026-05-29T00:00:00.000Z"
};

describe("toAccessGrantPayload", () => {
  it("normalizes grant form values", () => {
    assert.deepEqual(
      toAccessGrantPayload({
        guildId: " guild-1 ",
        targetType: "role",
        targetId: " role-1 ",
        role: "admin"
      }),
      {
        guildId: "guild-1",
        targetType: "role",
        targetId: "role-1",
        role: "admin"
      }
    );
  });
});

describe("upsertAccessGrant", () => {
  it("updates an existing grant for the same target", () => {
    const grants = upsertAccessGrant([baseGrant], {
      ...baseGrant,
      role: "admin",
      updatedAt: "2026-05-29T01:00:00.000Z"
    });

    assert.equal(grants.length, 1);
    assert.equal(grants[0]?.role, "admin");
    assert.equal(grants[0]?.updatedAt, "2026-05-29T01:00:00.000Z");
  });
});

describe("removeAccessGrant", () => {
  it("removes a grant by target identity", () => {
    assert.deepEqual(
      removeAccessGrant([baseGrant], {
        guildId: "guild-1",
        targetType: "user",
        targetId: "user-1"
      }),
      []
    );
  });
});
