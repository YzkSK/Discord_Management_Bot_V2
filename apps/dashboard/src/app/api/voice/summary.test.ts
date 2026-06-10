import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildVoiceSummary } from "./summary.js";

describe("buildVoiceSummary", () => {
  it("summarizes active and recent voice sessions with Temp VC details", () => {
    const startedAt = new Date("2026-06-03T01:00:00.000Z");
    const endedAt = new Date("2026-06-03T01:12:00.000Z");

    assert.deepEqual(
      buildVoiceSummary({
        now: endedAt,
        sessions: [
          {
            channelId: "voice-1",
            endedAt: null,
            id: "session-active",
            memberCount: 2,
            startedAt,
            status: "active"
          },
          {
            channelId: "voice-2",
            endedAt,
            id: "session-ended",
            memberCount: 0,
            startedAt,
            status: "ended"
          }
        ],
        tempVoiceChannels: [
          {
            channelId: "voice-1",
            controlChannelId: "control-1",
            creationChannelId: "create-1",
            deleteScheduledAt: null,
            ownerId: "owner-1"
          }
        ]
      }),
      {
        activeSessions: [
          {
            channelId: "voice-1",
            durationSeconds: 720,
            id: "session-active",
            memberCount: 2,
            startedAt: startedAt.toISOString(),
            status: "active",
            tempVoice: {
              controlChannelId: "control-1",
              creationChannelId: "create-1",
              deleteScheduledAt: null,
              ownerId: "owner-1"
            }
          }
        ],
        recentSessions: [
          {
            channelId: "voice-2",
            durationSeconds: 720,
            endedAt: endedAt.toISOString(),
            id: "session-ended",
            memberCount: 0,
            startedAt: startedAt.toISOString(),
            status: "ended",
            tempVoice: null
          }
        ],
        tempVoiceChannels: [
          {
            channelId: "voice-1",
            controlChannelId: "control-1",
            creationChannelId: "create-1",
            deleteScheduledAt: null,
            ownerId: "owner-1"
          }
        ]
      }
    );
  });
});
