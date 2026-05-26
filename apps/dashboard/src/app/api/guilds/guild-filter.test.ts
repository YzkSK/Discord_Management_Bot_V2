import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasDirectManagementPermission } from "./guild-filter.js";
import type { DiscordOAuthGuild } from "../../../discord-api.js";

function guild(override: Partial<DiscordOAuthGuild>): DiscordOAuthGuild {
  return { id: "1", name: "Test", owner: false, permissions: "0", ...override };
}

describe("hasDirectManagementPermission", () => {
  it("returns true when owner", () => {
    assert.equal(hasDirectManagementPermission(guild({ owner: true })), true);
  });

  it("returns true when ADMINISTRATOR bit (0x8) is set", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: "8" })),
      true
    );
  });

  it("returns true when permissions include ADMINISTRATOR among others", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: String(0x8 | 0x20) })),
      true
    );
  });

  it("returns false when only MANAGE_GUILD (0x20) without ADMINISTRATOR", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: "32" })),
      false
    );
  });

  it("returns false when permissions is 0", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: "0" })),
      false
    );
  });
});
