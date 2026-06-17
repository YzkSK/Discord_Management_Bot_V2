import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRecruitmentSummary } from "./summary.js";

describe("buildRecruitmentSummary", () => {
  it("summarizes recruitment status counts and message links", () => {
    const createdAt = new Date("2026-06-10T01:00:00.000Z");
    const updatedAt = new Date("2026-06-10T01:05:00.000Z");

    assert.deepEqual(
      buildRecruitmentSummary({
        guildId: "guild-1",
        recruitments: [
          {
            activeParticipantCount: 2,
            capacity: 4,
            channelId: "channel-1",
            closedAt: null,
            deadlineAt: null,
            content: "Ranked tonight",
            createdAt,
            creatorId: "user-1",
            genre: "Apex",
            id: "recruitment-1",
            messageId: "message-1",
            status: "open",
            updatedAt,
            voiceChannelId: "voice-1"
          },
          {
            activeParticipantCount: 3,
            capacity: 3,
            channelId: "channel-2",
            closedAt: updatedAt,
            deadlineAt: null,
            content: "Full party",
            createdAt,
            creatorId: "user-2",
            genre: "Valorant",
            id: "recruitment-2",
            messageId: null,
            status: "closed",
            updatedAt,
            voiceChannelId: null
          }
        ]
      }),
      {
        closedCount: 1,
        fullCount: 0,
        openCount: 1,
        recruitments: [
          {
            activeParticipantCount: 2,
            availableSlots: 2,
            capacity: 4,
            channelId: "channel-1",
            closedAt: null,
            content: "Ranked tonight",
            createdAt: createdAt.toISOString(),
            creatorId: "user-1",
            genre: "Apex",
            id: "recruitment-1",
            messageId: "message-1",
            postUrl:
              "https://discord.com/channels/guild-1/channel-1/message-1",
            status: "open",
            updatedAt: updatedAt.toISOString(),
            voiceChannelId: "voice-1"
          },
          {
            activeParticipantCount: 3,
            availableSlots: 0,
            capacity: 3,
            channelId: "channel-2",
            closedAt: updatedAt.toISOString(),
            content: "Full party",
            createdAt: createdAt.toISOString(),
            creatorId: "user-2",
            genre: "Valorant",
            id: "recruitment-2",
            messageId: null,
            postUrl: null,
            status: "closed",
            updatedAt: updatedAt.toISOString(),
            voiceChannelId: null
          }
        ],
        totalCount: 2
      }
    );
  });
});
