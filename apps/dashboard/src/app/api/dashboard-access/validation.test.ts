import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseDashboardAccessGrantBody,
  parseDashboardAccessGrantDeleteBody
} from "./validation.js";

describe("parseDashboardAccessGrantBody", () => {
  it("accepts a user grant body", () => {
    assert.deepEqual(
      parseDashboardAccessGrantBody({
        guildId: " guild-1 ",
        targetType: "user",
        targetId: " user-1 ",
        role: "admin"
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          targetType: "user",
          targetId: "user-1",
          role: "admin"
        }
      }
    );
  });

  it("rejects owner as a grantable role", () => {
    assert.deepEqual(
      parseDashboardAccessGrantBody({
        guildId: "guild-1",
        targetType: "user",
        targetId: "user-1",
        role: "owner"
      }),
      { ok: false, error: "role must be viewer or admin." }
    );
  });
});

describe("parseDashboardAccessGrantDeleteBody", () => {
  it("accepts a role grant delete body", () => {
    assert.deepEqual(
      parseDashboardAccessGrantDeleteBody({
        guildId: "guild-1",
        targetType: "role",
        targetId: "role-1"
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          targetType: "role",
          targetId: "role-1"
        }
      }
    );
  });
});
