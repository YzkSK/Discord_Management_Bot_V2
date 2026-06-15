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

function makeRecruitment(overrides: Partial<{
  id: string; guildId: string; channelId: string; messageId: string | null;
  creatorId: string; genre: string; capacity: number; content: string;
  voiceChannelId: string | null; status: string;
  closedAt: Date | null; updatedAt: Date; createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "r1",
    guildId: overrides.guildId ?? "g1",
    channelId: overrides.channelId ?? "c1",
    messageId: overrides.messageId ?? null,
    creatorId: overrides.creatorId ?? "u1",
    genre: overrides.genre ?? "FPS",
    capacity: overrides.capacity ?? 4,
    content: overrides.content ?? "Let's play",
    voiceChannelId: overrides.voiceChannelId ?? null,
    status: overrides.status ?? "open",
    closedAt: overrides.closedAt ?? null,
    updatedAt: new Date(),
    createdAt: new Date()
  };
}

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
  it("parses join action", () => {
    const customId = createRecruitmentCustomId("join", "recruitment-1");
    assert.deepEqual(parseRecruitmentCustomId(customId), {
      action: "join",
      recruitmentId: "recruitment-1"
    });
  });

  it("parses reopen action", () => {
    const id = createRecruitmentCustomId("reopen", "r1");
    assert.deepEqual(parseRecruitmentCustomId(id), { action: "reopen", recruitmentId: "r1" });
  });

  it("rejects removed settings action", () => {
    assert.equal(parseRecruitmentCustomId("recruitment:settings:r1"), null);
  });

  it("rejects removed toggle-auto-close action", () => {
    assert.equal(parseRecruitmentCustomId("recruitment:toggle-auto-close:r1"), null);
  });

  it("ignores custom ids from other features", () => {
    assert.equal(parseRecruitmentCustomId("temp-vc:join:1"), null);
  });
});

describe("createRecruitmentPostMessage", () => {
  it("formats a recruitment post as Components V2 with 2 top-level components", () => {
    const message = createRecruitmentPostMessage(makeRecruitment(), getLocale("ja"));
    assert.equal(message.components?.length, 2);
    assert.equal(message.flags, MessageFlags.IsComponentsV2);
  });

  it("includes 3 buttons: join, leave, close (when open)", () => {
    const msg = createRecruitmentPostMessage(makeRecruitment({ status: "open" }), getLocale("ja"));
    const actionRow = msg.components?.[1] as { components: unknown[] };
    assert.equal(actionRow.components.length, 3);
  });

  it("shows reopen button instead of close when closed", () => {
    const msg = createRecruitmentPostMessage(
      makeRecruitment({ status: "closed" }),
      getLocale("ja")
    );
    const actionRow = msg.components?.[1] as { components: { customId?: string }[] };
    const ids = actionRow.components.map((b) => b.customId ?? "");
    assert.ok(ids.some((id) => id.includes("reopen")), "should have reopen button");
    assert.ok(!ids.some((id) => id.includes("close")), "should not have close button");
  });

  it("disables join button when closed", () => {
    const msg = createRecruitmentPostMessage(
      makeRecruitment({ status: "closed" }),
      getLocale("ja")
    );
    const actionRow = msg.components?.[1] as { components: { customId?: string; disabled?: boolean }[] };
    const joinBtn = actionRow.components.find((b) => b.customId?.includes("join"));
    assert.equal(joinBtn?.disabled, true);
  });

  it("renders participant list vertically", () => {
    const msg = createRecruitmentPostMessage(
      makeRecruitment(),
      getLocale("ja"),
      2,
      ["111", "222"]
    );
    const container = msg.components?.[0] as { components: { content?: string }[] };
    const participantComponent = container.components.find(
      (c) => c.content?.includes("<@111>") && c.content?.includes("<@222>")
    );
    assert.ok(participantComponent, "should include participant mentions");
    assert.ok(
      participantComponent?.content?.includes("\n"),
      "participants should be separated by newlines"
    );
  });

  it("renders queue section when queuedIds provided", () => {
    const msg = createRecruitmentPostMessage(
      makeRecruitment({ status: "full" }),
      getLocale("ja"),
      4,
      ["111", "222", "333", "444"],
      ["555"]
    );
    const container = msg.components?.[0] as { components: { content?: string }[] };
    const queueComponent = container.components.find((c) => c.content?.includes("<@555>"));
    assert.ok(queueComponent, "should render queue section");
  });

  it("omits queue section when no queued participants", () => {
    const msg = createRecruitmentPostMessage(
      makeRecruitment(),
      getLocale("ja"),
      1,
      ["111"],
      []
    );
    const container = msg.components?.[0] as { components: { content?: string }[] };
    const hasQueueLabel = container.components.some(
      (c) => c.content?.includes("待機中")
    );
    assert.equal(hasQueueLabel, false);
  });
});
