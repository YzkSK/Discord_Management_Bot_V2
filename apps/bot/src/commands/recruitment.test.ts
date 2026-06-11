import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChannelType } from "discord.js";

import { resolveRecruitmentChannel } from "./recruitment.js";

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
