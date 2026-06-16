import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleRecruitmentButtonInteraction } from "./recruitment-interactions.js";

function makeRecruitment(overrides: Partial<{
  id: string; guildId: string; channelId: string; messageId: string | null;
  creatorId: string; genre: string; capacity: number; content: string;
  voiceChannelId: string | null; status: string;
  closedAt: Date | null; updatedAt: Date; createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "recruitment-1",
    guildId: overrides.guildId ?? "guild-1",
    channelId: overrides.channelId ?? "channel-1",
    messageId: overrides.messageId ?? "message-1",
    creatorId: overrides.creatorId ?? "creator-1",
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

describe("handleRecruitmentButtonInteraction — unknown custom id", () => {
  it("returns false for unrelated custom ids", async () => {
    const result = await handleRecruitmentButtonInteraction(
      { customId: "other:action:id" } as never,
      { db: {} as never }
    );
    assert.equal(result, false);
  });
});

describe("handleRecruitmentButtonInteraction — join: already joined", () => {
  it("replies with already-joined message when user is active participant", async () => {
    const recruitment = makeRecruitment({ capacity: 4 });
    let replyTitle = "";
    const interaction = {
      customId: `recruitment:join:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "user-1" },
      memberPermissions: { has: () => false },
      message: { edit: async () => {} },
      channel: { send: async () => ({}) },
      reply: async (p: unknown) => {
        const text = JSON.stringify(p);
        replyTitle = text;
      }
    };

    let selectCallCount = 0;
    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        const isCount = selection && "value" in selection;

        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }

        // Not a guild config select, increment counter
        selectCallCount++;

        if (isCount) {
          return {
            from: () => ({
              where: () => ({
                limit: async () => [{ value: 1 }]
              })
            })
          };
        }

        // selectCallCount 1 = getRecruitmentById
        // selectCallCount 2 = getActiveParticipant
        // selectCallCount 3+ = listActiveRecruitmentParticipants, listQueuedParticipants
        if (selectCallCount === 1) {
          return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
        }

        if (selectCallCount === 2) {
          // getActiveParticipant: user exists and is not queued
          return {
            from: () => ({
              where: () => ({
                limit: async () => [{ userId: "user-1", recruitmentId: recruitment.id, isQueued: false, leftAt: null }]
              })
            })
          };
        }

        // listActiveRecruitmentParticipants, listQueuedParticipants
        return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) };
      },
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: async () => [] }) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) })
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.ok(
      replyTitle.includes("参加済") || replyTitle.includes("already joined"),
      `expected already-joined message, got: ${replyTitle}`
    );
  });

  it("replies with already-queued message when user is in queue", async () => {
    const recruitment = makeRecruitment({ capacity: 2 });
    let replyTitle = "";
    const interaction = {
      customId: `recruitment:join:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "user-1" },
      memberPermissions: { has: () => false },
      message: { edit: async () => {} },
      channel: { send: async () => ({}) },
      reply: async (p: unknown) => { replyTitle = JSON.stringify(p); }
    };

    let selectCallCount = 0;
    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        const isCount = selection && "value" in selection;

        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }

        selectCallCount++;

        if (isCount) {
          return { from: () => ({ where: () => ({ limit: async () => [{ value: 2 }] }) }) };
        }

        if (selectCallCount === 1) {
          return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
        }

        if (selectCallCount === 2) {
          // getActiveParticipant: user exists and IS queued
          return {
            from: () => ({
              where: () => ({
                limit: async () => [{ userId: "user-1", recruitmentId: recruitment.id, isQueued: true, leftAt: null }]
              })
            })
          };
        }

        return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) };
      },
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: async () => [] }) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) })
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.ok(
      replyTitle.includes("待機") || replyTitle.includes("queue"),
      `expected already-queued message, got: ${replyTitle}`
    );
  });
});

describe("handleRecruitmentButtonInteraction — join: queue when full", () => {
  it("adds user to queue when recruitment is full", async () => {
    const recruitment = makeRecruitment({ capacity: 2, status: "full" });
    let insertCalledWithQueue = false;

    let selectCallCount = 0;
    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        const isCount = selection && "value" in selection;

        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }

        selectCallCount++;

        if (isCount) {
          // countActiveRecruitmentParticipants returns count of 2 (at capacity)
          // Drizzle ORM chain: db.select({value: count()}).from().where() <- awaits this
          return { from: () => ({ where: async () => [{ value: 2 }] }) };
        }

        if (selectCallCount === 1) {
          return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
        }

        if (selectCallCount === 2) {
          // getActiveParticipant: user doesn't exist yet
          return { from: () => ({ where: () => ({ limit: async () => [] }) }) };
        }

        // listActiveRecruitmentParticipants, listQueuedParticipants
        return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) };
      },
      insert: () => ({
        values: (v: { isQueued?: boolean }) => {
          if (v.isQueued === true) {
            insertCalledWithQueue = true;
          }
          return {
            onConflictDoUpdate: () => ({
              returning: async () => [{ userId: "user-1", isQueued: true }]
            })
          };
        }
      }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [recruitment] }) }) })
    };

    const interaction = {
      customId: `recruitment:join:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "user-1" },
      memberPermissions: { has: () => false },
      message: { edit: async () => {} },
      channel: { send: async () => ({}) },
      reply: async () => {}
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.equal(insertCalledWithQueue, true, "user should be queued when recruitment is full");
  });
});

describe("handleRecruitmentButtonInteraction — leave: not joined", () => {
  it("replies with not-joined message when user has no record", async () => {
    const recruitment = makeRecruitment();
    let replyPayload = "";

    let selectCallCount = 0;
    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }
        selectCallCount++;
        if (selectCallCount === 1) {
          // getRecruitmentById
          return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
        }
        if (selectCallCount === 2) {
          // getActiveParticipant: user not found
          return { from: () => ({ where: () => ({ limit: async () => [] }) }) };
        }
        // listActiveRecruitmentParticipants, listQueuedParticipants
        return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) };
      },
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: async () => [] }) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) })
    };

    const interaction = {
      customId: `recruitment:leave:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "user-1" },
      memberPermissions: { has: () => false },
      message: { edit: async () => {} },
      channel: { send: async () => ({}) },
      reply: async (p: unknown) => { replyPayload = JSON.stringify(p); }
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.ok(
      replyPayload.includes("参加していません") || replyPayload.includes("haven"),
      `expected not-joined message, got: ${replyPayload}`
    );
  });
});

describe("handleRecruitmentButtonInteraction — leave: promotes from queue", () => {
  it("sends channel message when queue promotion happens", async () => {
    const recruitment = makeRecruitment({ capacity: 1, status: "full" });
    const channelSends: string[] = [];
    let selectCallCount = 0;

    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }
        selectCallCount++;

        if (selectCallCount === 1) {
          // getRecruitmentById
          return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
        }
        if (selectCallCount === 2) {
          // getActiveParticipant: user IS active (not queued)
          return {
            from: () => ({
              where: () => ({
                limit: async () => [{
                  userId: "user-1",
                  recruitmentId: recruitment.id,
                  isQueued: false,
                  leftAt: null
                }]
              })
            })
          };
        }
        if (selectCallCount === 3) {
          // promoteFromQueue: find first queued participant
          return {
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: async () => [{ id: "p2", userId: "queued-user", isQueued: true, leftAt: null }]
                })
              })
            })
          };
        }
        // listActiveRecruitmentParticipants and listQueuedParticipants
        return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) };
      },
      update: () => ({
        set: () => ({
          where: () => ({ returning: async () => [{ ...recruitment, status: "full" }] })
        })
      }),
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
        select: (s?: Record<string, unknown>) => db.select(s),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: async () => [{ id: "p2", userId: "queued-user", isQueued: false, queuedAt: null }]
            })
          })
        })
      })
    };

    const interaction = {
      customId: `recruitment:leave:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "user-1" },
      memberPermissions: { has: () => false },
      message: { edit: async () => {} },
      channel: {
        send: async (payload: unknown) => {
          channelSends.push(JSON.stringify(payload));
          return {};
        }
      },
      reply: async () => {}
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.ok(channelSends.length > 0, "should send promotion notification");
    assert.ok(
      channelSends[0]?.includes("queued-user") || channelSends[0]?.includes("参加枠"),
      `notification should mention promoted user, got: ${channelSends[0]}`
    );
  });
});

describe("handleRecruitmentButtonInteraction — reopen", () => {
  it("reopens recruitment and replies with success", async () => {
    const recruitment = makeRecruitment({ status: "closed", creatorId: "creator-1" });
    let replyPayload = "";
    let updateStatus: string | undefined;
    let selectCallCount = 0;

    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }
        selectCallCount++;
        if (selectCallCount === 1) {
          // getRecruitmentById
          return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
        }
        return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) };
      },
      update: () => ({
        set: (v: { status?: string }) => {
          updateStatus = v.status;
          return { where: () => ({ returning: async () => [{ ...recruitment, status: v.status ?? "open" }] }) };
        }
      })
    };

    const interaction = {
      customId: `recruitment:reopen:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "creator-1" },
      memberPermissions: { has: () => false },
      message: { edit: async () => {} },
      channel: { send: async () => ({}) },
      reply: async (p: unknown) => { replyPayload = JSON.stringify(p); }
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.equal(updateStatus, "open");
    assert.ok(
      replyPayload.includes("再オープン") || replyPayload.includes("reopened"),
      `expected reopen success message, got: ${replyPayload}`
    );
  });
});
