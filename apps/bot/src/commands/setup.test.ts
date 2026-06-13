import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { setupCommand, handleSetupCommand } from "./setup.js";

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

  it("includes status subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("status"));
  });
});

describe("handleSetupCommand — status", () => {
  it("replies with current guild config as gray embed", async () => {
    let replyPayload: unknown = null;

    await handleSetupCommand(
      {
        guildId: "guild-1",
        memberPermissions: { has: () => true },
        options: { getSubcommand: () => "status", getChannel: () => null },
        guild: {
          channels: {
            fetch: async () => new Map([
              ["vs-456", { id: "vs-456", type: 0, topic: "[discord-management-bot:voice-status]" }]
            ])
          }
        },
        reply: async (msg: unknown) => { replyPayload = msg; }
      } as never,
      {
        db: {
          select: () => ({
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: async () => [{
                    guildId: "guild-1",
                    guildName: "Test Guild",
                    isActive: true,
                    logMode: "full",
                    language: "en",
                    tempVoiceCreateChannelId: "vc-123",
                    tempVoiceCategoryId: null,
                    ttsTextChannelId: null,
                    recruitmentChannelId: null,
                    updatedAt: new Date()
                  }]
                })
              })
            })
          })
        } as never
      }
    );

    const s = JSON.stringify(replyPayload);
    assert.match(s, /vc-123/);
    assert.match(s, /vs-456/);
    assert.match(s, /Not configured|未設定/);
  });
});
