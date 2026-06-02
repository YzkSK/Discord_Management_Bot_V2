import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { setupCommand } from "./setup.js";

describe("setupCommand", () => {
  it("includes tts setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);

    assert.ok(subcommandNames?.includes("tts"));
  });

  it("includes voice status setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);

    assert.ok(subcommandNames?.includes("voice-status"));
  });
});
