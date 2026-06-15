import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChannelType } from "discord.js";

import { resolveRecruitmentChannel, handleRecruitmentModalSubmit } from "./recruitment.js";

describe("resolveRecruitmentChannel", () => {
  it("returns configured channel when recruitmentChannelId is set and channel exists", async () => {
    const fakeChannel = { id: "recruitment-ch", type: ChannelType.GuildText };

    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: {
        channels: { fetch: async (_id: string) => fakeChannel }
      } as never,
      interactionChannel: null,
      loadChannelId: async () => "recruitment-ch"
    });

    assert.equal(result?.id, "recruitment-ch");
  });

  it("falls back to interaction channel when no channelId is configured", async () => {
    const interactionChannel = { id: "cmd-channel", type: ChannelType.GuildText };

    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: { channels: { fetch: async () => null } } as never,
      interactionChannel: interactionChannel as never,
      loadChannelId: async () => null
    });

    assert.equal(result?.id, "cmd-channel");
  });

  it("falls back to interaction channel when configured channel has been deleted", async () => {
    const interactionChannel = { id: "cmd-channel", type: ChannelType.GuildText };

    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: { channels: { fetch: async () => null } } as never,
      interactionChannel: interactionChannel as never,
      loadChannelId: async () => "deleted-channel-id"
    });

    assert.equal(result?.id, "cmd-channel");
  });

  it("returns null when neither configured channel nor interaction channel is available", async () => {
    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: { channels: { fetch: async () => null } } as never,
      interactionChannel: null,
      loadChannelId: async () => null
    });

    assert.equal(result, null);
  });
});

describe("handleRecruitmentModalSubmit — wrong customId", () => {
  it("returns false for unrelated modal custom ids", async () => {
    const result = await handleRecruitmentModalSubmit(
      { customId: "other-modal" } as never,
      { db: {} as never }
    );
    assert.equal(result, false);
  });
});

describe("handleRecruitmentModalSubmit — invalid capacity", () => {
  it("replies with error when capacity is not a number", async () => {
    let replied = false;
    const interaction = {
      customId: "recruitment-create-modal",
      guildId: "g1",
      guild: {
        members: { fetch: async () => ({ voice: { channelId: null } }) },
        channels: { fetch: async () => null }
      },
      user: { id: "u1" },
      fields: { getTextInputValue: (id: string) => id === "capacity" ? "abc" : "test" },
      reply: async () => { replied = true; },
      channel: null
    };
    const db = {
      select: (sel?: Record<string, unknown>) => {
        if (sel && "language" in sel) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }
        return { from: () => ({ where: () => ({ limit: async () => [] }) }) };
      }
    };

    await handleRecruitmentModalSubmit(interaction as never, { db: db as never });
    assert.equal(replied, true);
  });
});

describe("handleRecruitmentModalSubmit — valid input", () => {
  it("creates recruitment and replies on success", async () => {
    let replied = false;

    const fakeRecruitment = {
      id: "r1", genre: "Test Title", capacity: 4, content: "Let's play",
      voiceChannelId: "vc-1", status: "open" as const,
      closedAt: null, creatorId: "u1",
      guildId: "g1", channelId: "recruitment-ch", messageId: null,
      createdAt: new Date(), updatedAt: new Date()
    };

    const fakeChannel = {
      id: "recruitment-ch",
      type: 0,
      send: async () => ({ id: "msg-1", url: "https://discord.com/channels/1/2/3" })
    };

    const interaction = {
      customId: "recruitment-create-modal",
      guildId: "g1",
      guild: {
        members: { fetch: async () => ({ voice: { channelId: "vc-1" } }) },
        channels: { fetch: async () => fakeChannel }
      },
      user: { id: "u1" },
      fields: {
        getTextInputValue: (id: string) =>
          id === "title" ? "Test Title" : id === "capacity" ? "4" : "Let's play"
      },
      reply: async () => { replied = true; },
      channel: fakeChannel
    };

    const db = {
      select: (sel?: Record<string, unknown>) => {
        if (sel && "language" in sel) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: async () => [{ language: "ja", recruitmentChannelId: "recruitment-ch" }]
                })
              })
            })
          };
        }
        return { from: () => ({ where: () => ({ limit: async () => [fakeRecruitment] }) }) };
      },
      insert: () => ({
        values: () => ({ returning: async () => [fakeRecruitment] })
      }),
      update: () => ({
        set: () => ({ where: () => ({ returning: async () => [{ ...fakeRecruitment, messageId: "msg-1" }] }) })
      })
    };

    await handleRecruitmentModalSubmit(interaction as never, {
      db: db as never,
      loadRecruitmentChannelId: async () => "recruitment-ch"
    });
    assert.equal(replied, true);
  });
});
