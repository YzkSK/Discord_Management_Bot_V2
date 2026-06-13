import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MessageFlags } from "discord.js";
import { getLocale } from "@discord-bot/shared";

import {
  appendRecruitmentChannelMarker,
  createRecruitmentCustomId,
  createRecruitmentPostMessage,
  hasRecruitmentChannelMarker,
  parseRecruitmentCustomId,
  recruitmentChannelTopicMarker
} from "./recruitment-channel.js";

describe("recruitment channel marker", () => {
  it("detects marked channel topics", () => {
    assert.equal(hasRecruitmentChannelMarker(recruitmentChannelTopicMarker), true);
    assert.equal(hasRecruitmentChannelMarker("general recruitment"), false);
    assert.equal(hasRecruitmentChannelMarker(null), false);
  });

  it("appends the marker without dropping existing topic text", () => {
    assert.equal(
      appendRecruitmentChannelMarker("existing topic"),
      `existing topic\n${recruitmentChannelTopicMarker}`
    );
  });

  it("does not duplicate the marker", () => {
    assert.equal(
      appendRecruitmentChannelMarker(recruitmentChannelTopicMarker),
      recruitmentChannelTopicMarker
    );
  });
});

describe("recruitment custom ids", () => {
  it("parses recruitment component custom ids", () => {
    const customId = createRecruitmentCustomId("join", "recruitment-1");

    assert.deepEqual(parseRecruitmentCustomId(customId), {
      action: "join",
      recruitmentId: "recruitment-1"
    });
  });

  it("ignores custom ids from other features", () => {
    assert.equal(parseRecruitmentCustomId("temp-vc:join:1"), null);
  });
});

describe("createRecruitmentPostMessage", () => {
  it("formats a recruitment post as Components V2", () => {
    const message = createRecruitmentPostMessage({
      id: "recruitment-1",
      guildId: "guild-1",
      channelId: "channel-1",
      messageId: null,
      creatorId: "user-1",
      genre: "Ranked",
      capacity: 5,
      content: "Need teammates.",
      voiceChannelId: "voice-1",
      autoClose: true,
      status: "open",
      autoClosed: false,
      closedAt: null,
      createdAt: new Date("2026-05-12T00:00:00.000Z"),
      updatedAt: new Date("2026-05-12T00:00:00.000Z")
    }, getLocale("ja"));

    assert.equal(message.components?.length, 2);
    assert.equal(message.flags, MessageFlags.IsComponentsV2);
  });
});

describe("settings custom id", () => {
  it("parses settings action", () => {
    const id = createRecruitmentCustomId("settings", "r1");
    assert.deepEqual(parseRecruitmentCustomId(id), {
      action: "settings",
      recruitmentId: "r1"
    });
  });

  it("parses toggle-auto-close action", () => {
    const id = createRecruitmentCustomId("toggle-auto-close", "r1");
    assert.deepEqual(parseRecruitmentCustomId(id), {
      action: "toggle-auto-close",
      recruitmentId: "r1"
    });
  });
});

describe("createRecruitmentPostMessage with settings button", () => {
  it("includes 4 buttons: join, leave, close, settings", () => {
    const msg = createRecruitmentPostMessage({
      id: "r1", guildId: "g1", channelId: "c1", messageId: null,
      creatorId: "u1", genre: "Test", capacity: 4, content: "x",
      voiceChannelId: null, autoClose: true, status: "open",
      autoClosed: false, closedAt: null,
      createdAt: new Date(), updatedAt: new Date()
    }, getLocale("ja"));

    const actionRow = msg.components?.[1] as { components: unknown[] };
    assert.equal(actionRow.components.length, 4);
  });
});
