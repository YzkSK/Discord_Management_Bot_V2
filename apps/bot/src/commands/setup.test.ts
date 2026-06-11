import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { setupCommand } from "./setup.js";

describe("setupCommand", () => {
  it("includes temp-vc setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("temp-vc"));
  });

  it("includes logs setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("logs"));
  });

  it("includes voice-status setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("voice-status"));
  });

  it("does not include tts setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(!subcommandNames?.includes("tts"));
  });

  it("does not include recruitment setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(!subcommandNames?.includes("recruitment"));
  });
});
