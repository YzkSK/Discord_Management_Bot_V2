import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createVoiceActivityStatusScheduler,
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

  it("publishes started status and schedules active update for a new session", async () => {
    const repository = createMemoryRepository();
    const statusUpdates: string[] = [];
    const scheduled: number[] = [];

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
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        repository,
        scheduleActiveStatusUpdate: async (sessionId, delayMs) => {
          scheduled.push(delayMs);
          statusUpdates.push(`scheduled:${sessionId}`);
        },
        updateVoiceStatus: async (input) => {
          statusUpdates.push(`${input.state}:${input.session.id}`);
          return "message-1";
        },
        writeLog: async () => undefined
      }
    );

    assert.equal(repository.sessions[0]?.statusMessageId, "message-1");
    assert.deepEqual(statusUpdates, [
      "started:session-1",
      "scheduled:session-1"
    ]);
    assert.deepEqual(scheduled, [60_000]);
  });

  it("does not publish call status for ignored creation voice channels", async () => {
    const repository = createMemoryRepository();
    const events: string[] = [];
    const statusUpdates: string[] = [];

    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "temp-vc-create",
        oldChannelId: null,
        type: "join",
        userId: "user-1"
      },
      {
        ignoredChannelIds: new Set(["temp-vc-create"]),
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        repository,
        updateVoiceStatus: async (input) => {
          statusUpdates.push(`${input.state}:${input.session.id}`);
          return "message-1";
        },
        writeLog: async (event) => {
          events.push(event.eventName);
        }
      }
    );

    assert.equal(repository.sessions.length, 0);
    assert.equal(repository.members.length, 0);
    assert.deepEqual(events, []);
    assert.deepEqual(statusUpdates, []);
  });

  it("publishes started status for pre-created Temp VC sessions when the owner moves in", async () => {
    const repository = createMemoryRepository();
    const events: string[] = [];
    const scheduled: number[] = [];
    const statusUpdates: string[] = [];

    repository.sessions.push({
      channelId: "temp-voice-1",
      guildId: "guild-1",
      id: "session-1",
      startedAt: new Date("2026-06-03T00:00:00.000Z"),
      status: "active",
      statusMessageId: null
    });
    repository.members.push({
      callSessionId: "session-1",
      leftAt: null,
      userId: "user-1"
    });

    await handleVoiceActivityTransition(
      {
        guildId: "guild-1",
        memberIsBot: false,
        newChannelId: "temp-voice-1",
        oldChannelId: "temp-vc-create",
        type: "move",
        userId: "user-1"
      },
      {
        ignoredChannelIds: new Set(["temp-vc-create"]),
        now: () => new Date("2026-06-03T00:00:05.000Z"),
        repository,
        scheduleActiveStatusUpdate: async (sessionId, delayMs) => {
          scheduled.push(delayMs);
          statusUpdates.push(`scheduled:${sessionId}`);
        },
        updateVoiceStatus: async (input) => {
          statusUpdates.push(
            `${input.state}:${input.session.id}:${input.activeMemberCount}`
          );
          return "message-1";
        },
        writeLog: async (event) => {
          events.push(`${event.eventName}:${event.channelId}`);
        }
      }
    );

    assert.equal(repository.sessions.length, 1);
    assert.equal(repository.sessions[0]?.statusMessageId, "message-1");
    assert.deepEqual(events, ["call.started:temp-voice-1"]);
    assert.deepEqual(statusUpdates, [
      "started:session-1:1",
      "scheduled:session-1"
    ]);
    assert.deepEqual(scheduled, [60_000]);
  });

  it("updates the existing status message to ended when the session finishes", async () => {
    const repository = createMemoryRepository();
    const statusUpdates: string[] = [];
    const context = {
      now: () => new Date("2026-06-03T00:00:30.000Z"),
      repository,
      updateVoiceStatus: async (input: {
        state: string;
        session: { id: string };
      }) => {
        statusUpdates.push(`${input.state}:${input.session.id}`);
        return "message-1";
      },
      writeLog: async () => undefined
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
        newChannelId: null,
        oldChannelId: "voice-1",
        type: "leave",
        userId: "user-1"
      },
      context
    );

    assert.deepEqual(statusUpdates, [
      "started:session-1",
      "ended:session-1"
    ]);
  });

  it("publishes call.ended even when move and rapid leave overlap (upsertMember race)", async () => {
    // Regression: when move(A→B) and leave(B→∅) are processed out of order,
    // upsertMember (from move's join-B) can run after markMemberLeft (from leave-B),
    // re-activating the member so listActiveMembers returns non-empty and endSession
    // is never called → call.ended never published.
    //
    // The fix (voice-state.ts enqueueTransitionOnKeys) ensures the move always
    // completes before the leave begins, so we verify the correct order here.
    const repository = createMemoryRepository();
    const events: string[] = [];
    const context = {
      now: () => new Date("2026-06-03T00:00:05.000Z"),
      repository,
      writeLog: async (event: { eventName: string }) => {
        events.push(event.eventName);
      }
    };

    // Simulate: session pre-created by createTempVoiceChannel, owner already a member
    repository.sessions.push({
      channelId: "temp-b",
      guildId: "guild-1",
      id: "session-1",
      startedAt: new Date("2026-06-03T00:00:00.000Z"),
      status: "active",
      statusMessageId: null
    });
    repository.members.push({
      callSessionId: "session-1",
      leftAt: null,
      userId: "user-1"
    });

    // Correct order (move's join-B then leave-B): both handlers complete in sequence
    await handleVoiceActivityTransition(
      { guildId: "guild-1", memberIsBot: false, newChannelId: "temp-b", oldChannelId: "trigger", type: "move", userId: "user-1" },
      { ...context, ignoredChannelIds: new Set(["trigger"]) }
    );
    await handleVoiceActivityTransition(
      { guildId: "guild-1", memberIsBot: false, newChannelId: null, oldChannelId: "temp-b", type: "leave", userId: "user-1" },
      context
    );

    assert.equal(repository.sessions[0]?.status, "ended");
    assert.deepEqual(events, ["call.started", "call.ended"]);
  });

  it("keeps refreshing active voice status while the session remains active", async () => {
    const delays: number[] = [];
    const refreshes: string[] = [];
    const timers: Array<() => void> = [];

    const scheduleActiveStatusUpdate = createVoiceActivityStatusScheduler({
      refresh: async (sessionId) => {
        refreshes.push(sessionId);
        return refreshes.length < 2;
      },
      setTimeout: (handler, delayMs) => {
        delays.push(delayMs);
        timers.push(handler);
      }
    });

    await scheduleActiveStatusUpdate("session-1", 60_000);
    assert.deepEqual(delays, [60_000]);

    timers[0]?.();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(refreshes, ["session-1"]);
    assert.deepEqual(delays, [60_000, 60_000]);

    timers[1]?.();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(refreshes, ["session-1", "session-1"]);
    assert.deepEqual(delays, [60_000, 60_000]);
  });
});

function createMemoryRepository() {
  const sessions: Array<{
    channelId: string;
    guildId: string;
    id: string;
    startedAt: Date;
    status: "active" | "ended";
    statusMessageId: string | null;
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
      const existing = sessions.find(
        (s) => s.channelId === input.channelId && s.status === "active"
      );
      if (existing) {
        return { created: false, session: existing };
      }
      const session = {
        channelId: input.channelId,
        guildId: input.guildId,
        id: `session-${sessions.length + 1}`,
        startedAt: input.startedAt,
        status: "active" as const,
        statusMessageId: null
      };
      sessions.push(session);
      return { created: true, session };
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
    async updateStatusMessage(input) {
      const session = sessions.find((item) => item.id === input.callSessionId);
      if (session) {
        session.statusMessageId = input.statusMessageId;
      }
      return session ?? null;
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
