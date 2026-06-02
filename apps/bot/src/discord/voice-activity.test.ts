import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createVoiceActivityEndedEvent,
  createVoiceActivityStartedEvent,
  handleVoiceActivityTransition,
  type VoiceActivityRepository
} from "./voice-activity.js";

describe("voice activity sessions", () => {
  it("starts an active call session when a user joins an empty voice channel", async () => {
    const repository = createMemoryRepository();
    const events: string[] = [];

    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "voice-1",
        oldChannelId: null,
        type: "join",
        userId: "user-1"
      },
      {
        now: () => new Date("2026-06-02T00:00:00.000Z"),
        repository,
        writeLog: async (event) => {
          events.push(event.eventName);
        }
      }
    );

    assert.equal(repository.sessions.length, 1);
    assert.equal(repository.sessions[0]?.status, "active");
    assert.equal(repository.members.length, 1);
    assert.deepEqual(events, ["call.started"]);
  });

  it("keeps the session active while members remain and ends it when empty", async () => {
    const repository = createMemoryRepository();
    const events: string[] = [];
    const context = {
      now: () => new Date("2026-06-02T00:00:00.000Z"),
      repository,
      writeLog: async (event: { eventName: string }) => {
        events.push(event.eventName);
      }
    };

    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "voice-1",
        oldChannelId: null,
        type: "join",
        userId: "user-1"
      },
      context
    );
    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "voice-1",
        oldChannelId: null,
        type: "join",
        userId: "user-2"
      },
      context
    );
    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: null,
        oldChannelId: "voice-1",
        type: "leave",
        userId: "user-1"
      },
      context
    );

    assert.equal(repository.sessions[0]?.status, "active");

    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: null,
        oldChannelId: "voice-1",
        type: "leave",
        userId: "user-2"
      },
      context
    );

    assert.equal(repository.sessions[0]?.status, "ended");
    assert.deepEqual(events, ["call.started", "call.ended"]);
  });

  it("treats a move as leaving the old channel and joining the new channel", async () => {
    const repository = createMemoryRepository();
    const events: string[] = [];
    const context = {
      now: () => new Date("2026-06-02T00:00:00.000Z"),
      repository,
      writeLog: async (event: { eventName: string; channelId: string | null }) => {
        events.push(`${event.eventName}:${event.channelId}`);
      }
    };

    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "voice-1",
        oldChannelId: null,
        type: "join",
        userId: "user-1"
      },
      context
    );
    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "voice-2",
        oldChannelId: "voice-1",
        type: "move",
        userId: "user-1"
      },
      context
    );

    assert.deepEqual(
      repository.sessions.map((session) => [session.channelId, session.status]),
      [
        ["voice-1", "ended"],
        ["voice-2", "active"]
      ]
    );
    assert.deepEqual(events, [
      "call.started:voice-1",
      "call.ended:voice-1",
      "call.started:voice-2"
    ]);
  });

  it("creates call started and ended log events", () => {
    const started = createVoiceActivityStartedEvent({
      actorId: "user-1",
      channelId: "voice-1",
      guildId: "guild-1",
      sessionId: "session-1",
      startedAt: new Date("2026-06-02T00:00:00.000Z")
    });
    const ended = createVoiceActivityEndedEvent({
      actorId: "user-1",
      channelId: "voice-1",
      endedAt: new Date("2026-06-02T00:01:00.000Z"),
      guildId: "guild-1",
      sessionId: "session-1"
    });

    assert.equal(started.eventName, "call.started");
    assert.equal(ended.eventName, "call.ended");
    assert.equal(started.payload.sessionId, "session-1");
    assert.equal(ended.payload.sessionId, "session-1");
  });
});

function createMemoryRepository() {
  const sessions: Array<{
    channelId: string;
    guildId: string;
    id: string;
    status: "active" | "ended";
  }> = [];
  const members: Array<{
    callSessionId: string;
    leftAt: Date | null;
    userId: string;
  }> = [];

  const repository: VoiceActivityRepository & {
    members: typeof members;
    sessions: typeof sessions;
  } = {
    members,
    sessions,
    async createSession(input) {
      const session = {
        channelId: input.channelId,
        guildId: input.guildId,
        id: `session-${sessions.length + 1}`,
        status: "active" as const
      };
      sessions.push(session);
      return session;
    },
    async endSession(input) {
      const session = sessions.find((item) => item.id === input.callSessionId);
      if (session) {
        session.status = "ended";
      }
      return session ?? null;
    },
    async findActiveSessionByChannelId(_guildId, channelId) {
      return (
        sessions.find(
          (session) =>
            session.channelId === channelId && session.status === "active"
        ) ?? null
      );
    },
    async listActiveMembers(callSessionId) {
      return members.filter(
        (member) =>
          member.callSessionId === callSessionId && member.leftAt === null
      );
    },
    async markMemberLeft(input) {
      const member = members.find(
        (item) =>
          item.callSessionId === input.callSessionId &&
          item.userId === input.userId
      );
      if (member) {
        member.leftAt = input.leftAt;
      }
      return member ?? null;
    },
    async upsertMember(input) {
      const existing = members.find(
        (member) =>
          member.callSessionId === input.callSessionId &&
          member.userId === input.userId
      );
      if (existing) {
        existing.leftAt = null;
        return existing;
      }

      const member = {
        callSessionId: input.callSessionId,
        leftAt: null,
        userId: input.userId
      };
      members.push(member);
      return member;
    }
  };

  return repository;
}
