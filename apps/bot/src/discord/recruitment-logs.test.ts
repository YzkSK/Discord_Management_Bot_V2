import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRecruitmentEvent } from "./recruitment-logs.js";

describe("createRecruitmentEvent", () => {
  it("creates a normalized recruitment lifecycle event", () => {
    const event = createRecruitmentEvent("recruitment.created", {
      actorId: "user-1",
      participantCount: 0,
      reason: "created",
      recruitment: {
        id: "recruitment-1",
        guildId: "guild-1",
        channelId: "channel-1",
        messageId: "message-1",
        creatorId: "user-1",
        genre: "Game",
        capacity: 4,
        voiceChannelId: null,
        autoClose: true,
        autoClosed: false,
        status: "open"
      }
    });

    assert.equal(event.eventName, "recruitment.created");
    assert.equal(event.guildId, "guild-1");
    assert.equal(event.actorId, "user-1");
    assert.equal(event.channelId, "channel-1");
    assert.equal(event.messageId, "message-1");
    assert.deepEqual(event.payload, {
      recruitmentId: "recruitment-1",
      creatorId: "user-1",
      genre: "Game",
      capacity: 4,
      participantCount: 0,
      status: "open",
      autoClose: true,
      autoClosed: false,
      voiceChannelId: null,
      reason: "created"
    });
  });
});
