import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildTtsSummary } from "./summary.js";

describe("buildTtsSummary", () => {
  it("summarizes TTS settings, dictionary entries, and speaker settings", () => {
    const updatedAt = new Date("2026-06-10T01:05:00.000Z");

    assert.deepEqual(
      buildTtsSummary({
        dictionaryEntries: [
          {
            fromText: "www",
            guildId: "guild-1",
            isEnabled: true,
            priority: 10,
            scope: "guild",
            toText: "わら",
            updatedAt,
            userId: null
          },
          {
            fromText: "omg",
            guildId: "guild-1",
            isEnabled: false,
            priority: 5,
            scope: "user",
            toText: "oh my god",
            updatedAt,
            userId: "user-1"
          }
        ],
        guildDefaultSpeaker: {
          guildId: "guild-1",
          speakerId: 3,
          updatedAt,
          userId: null
        },
        guildId: "guild-1",
        ttsTextChannelId: "text-1",
        userSpeakers: [
          {
            guildId: "guild-1",
            speakerId: 8,
            updatedAt,
            userId: "user-1"
          }
        ]
      }),
      {
        dictionaryEntries: [
          {
            fromText: "www",
            isEnabled: true,
            priority: 10,
            scope: "guild",
            toText: "わら",
            updatedAt: updatedAt.toISOString(),
            userId: null
          },
          {
            fromText: "omg",
            isEnabled: false,
            priority: 5,
            scope: "user",
            toText: "oh my god",
            updatedAt: updatedAt.toISOString(),
            userId: "user-1"
          }
        ],
        dictionaryStats: {
          disabledCount: 1,
          enabledCount: 1,
          guildCount: 1,
          totalCount: 2,
          userCount: 1
        },
        guildDefaultSpeaker: {
          speakerId: 3,
          updatedAt: updatedAt.toISOString()
        },
        guildId: "guild-1",
        isConfigured: true,
        ttsTextChannelId: "text-1",
        userSpeakers: [
          {
            speakerId: 8,
            updatedAt: updatedAt.toISOString(),
            userId: "user-1"
          }
        ],
        userSpeakerCount: 1
      }
    );
  });
});
