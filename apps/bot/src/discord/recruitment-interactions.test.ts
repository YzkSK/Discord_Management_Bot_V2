import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleRecruitmentButtonInteraction } from "./recruitment-interactions.js";

function makeRecruitment(overrides: Partial<{
  id: string;
  guildId: string;
  channelId: string;
  messageId: string | null;
  creatorId: string;
  genre: string;
  capacity: number;
  content: string;
  voiceChannelId: string | null;
  autoClose: boolean;
  autoClosed: boolean;
  status: string;
  closedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
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
    autoClose: overrides.autoClose ?? true,
    autoClosed: overrides.autoClosed ?? false,
    status: overrides.status ?? "open",
    closedAt: overrides.closedAt ?? null,
    updatedAt: new Date(),
    createdAt: new Date()
  };
}

/**
 * Builds a minimal fake db for handleJoin tests.
 *
 * DB calls in handleJoin order:
 * 1. resolveLocale → getGuildConfigByGuildId → select({language,...}).from().innerJoin().where().limit() → []
 * 2. getRecruitmentById → select().from().where().limit() → [recruitment]
 * 3. countActiveRecruitmentParticipants (before join) → select({value:count()}).from().where() → [{value: N}]
 * 4. joinRecruitment → insert().values().onConflictDoUpdate().returning() → [participant]
 * 5. countActiveRecruitmentParticipants (after join) → select({value:count()}).from().where() → [{value: M}]
 * 6. updateRecruitmentStatus → update().set().where().returning() → [updatedRecruitment]
 * 7. resolveLocale (for notification, only if auto-close) → same as #1 → []
 */
function makeJoinDb(opts: {
  recruitment: ReturnType<typeof makeRecruitment>;
  beforeCount: number;
  afterCount: number;
  updatedRecruitment?: ReturnType<typeof makeRecruitment>;
}) {
  const updatedRecruitment = opts.updatedRecruitment ?? {
    ...opts.recruitment,
    status: opts.afterCount >= opts.recruitment.capacity
      ? (opts.recruitment.autoClose ? "closed" : "full")
      : "open"
  };

  let selectCallCount = 0;

  return {
    select: (selection?: Record<string, unknown>) => {
      // Detect guild config lookup (has 'language' field in selection)
      const isGuildConfig = selection && "language" in selection;
      // Detect count query (has 'value' field)
      const isCountQuery = selection && "value" in selection;
      selectCallCount++;

      if (isGuildConfig) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: () => ({ limit: async () => [] })
            })
          })
        };
      }

      if (isCountQuery) {
        // Called twice: before join and after join
        // We track via closure which call this is
        const countValue = selectCallCount <= 2 ? opts.beforeCount : opts.afterCount;
        return {
          from: () => ({
            where: async () => [{ value: countValue }]
          })
        };
      }

      // getRecruitmentById: select().from().where().limit()
      return {
        from: () => ({
          where: () => ({
            limit: async () => [opts.recruitment]
          })
        })
      };
    },
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [{
            recruitmentId: opts.recruitment.id,
            userId: "user-1",
            joinedAt: new Date(),
            leftAt: null,
            updatedAt: new Date()
          }]
        }),
        returning: async () => []
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [updatedRecruitment]
        })
      })
    })
  };
}

/**
 * Builds a minimal fake db for handleLeave tests.
 *
 * DB calls in handleLeave order:
 * 1. resolveLocale → getGuildConfigByGuildId → select({language,...}).from().innerJoin().where().limit() → []
 * 2. getRecruitmentById → select().from().where().limit() → [recruitment]
 * 3. leaveRecruitment → update().set().where() → returns participant (but not used)
 * 4. countActiveRecruitmentParticipants → select({value:count()}).from().where() → [{value: N}]
 * 5. updateRecruitmentStatus (only if shouldReopen) → update().set().where().returning() → [updated]
 * 6. resolveLocale (for notification, only if shouldReopen) → same as #1 → []
 */
function makeLeaveDb(opts: {
  recruitment: ReturnType<typeof makeRecruitment>;
  afterCount: number;
  updatedRecruitment?: ReturnType<typeof makeRecruitment>;
}) {
  const updatedRecruitment = opts.updatedRecruitment ?? {
    ...opts.recruitment,
    status: "open",
    autoClosed: false,
    closedAt: null
  };

  let updateCallCount = 0;

  return {
    select: (selection?: Record<string, unknown>) => {
      const isGuildConfig = selection && "language" in selection;
      const isCountQuery = selection && "value" in selection;

      if (isGuildConfig) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: () => ({ limit: async () => [] })
            })
          })
        };
      }

      if (isCountQuery) {
        return {
          from: () => ({
            where: async () => [{ value: opts.afterCount }]
          })
        };
      }

      // getRecruitmentById
      return {
        from: () => ({
          where: () => ({
            limit: async () => [opts.recruitment]
          })
        })
      };
    },
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: async () => [] }),
        returning: async () => []
      })
    }),
    update: () => ({
      set: () => ({
        where: () => {
          updateCallCount++;
          // leaveRecruitment update returns participant (not .returning() chained differently)
          // updateRecruitmentStatus uses .returning()
          return {
            returning: async () => [updatedRecruitment]
          };
        }
      })
    })
  };
}

function makeButtonInteraction(opts: {
  action: "join" | "leave" | "close";
  recruitmentId?: string;
  userId?: string;
  guildId?: string;
  onChannelSend?: (payload: unknown) => void;
}) {
  const recruitmentId = opts.recruitmentId ?? "recruitment-1";
  const customId = `recruitment:${opts.action}:${recruitmentId}`;
  const channelSends: string[] = [];

  return {
    customId,
    guildId: opts.guildId ?? "guild-1",
    user: { id: opts.userId ?? "user-1" },
    memberPermissions: { has: () => false },
    message: {
      edit: async () => {}
    },
    channel: {
      send: async (payload: unknown) => {
        const serialized = JSON.stringify(payload);
        channelSends.push(serialized);
        opts.onChannelSend?.(payload);
        return {};
      }
    },
    reply: async () => {},
    _channelSends: channelSends
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

describe("handleRecruitmentButtonInteraction — join auto-close notification", () => {
  it("sends a channel notification when join triggers auto-close", async () => {
    // capacity=1, beforeCount=0, afterCount=1 → hits capacity with autoClose=true → "closed"
    const recruitment = makeRecruitment({ capacity: 1, autoClose: true, status: "open" });
    const interaction = makeButtonInteraction({ action: "join" });

    const db = makeJoinDb({
      recruitment,
      beforeCount: 0,
      afterCount: 1,
      updatedRecruitment: { ...recruitment, status: "closed", autoClosed: true, closedAt: new Date(), updatedAt: new Date(), createdAt: new Date() }
    });

    // Override count to be sequential: first call returns 0, second returns 1
    let countCall = 0;
    const dbWithSequentialCount = {
      ...db,
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        const isCountQuery = selection && "value" in selection;

        if (isGuildConfig) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({ limit: async () => [] })
              })
            })
          };
        }

        if (isCountQuery) {
          countCall++;
          const val = countCall === 1 ? 0 : 1;
          return {
            from: () => ({
              where: async () => [{ value: val }]
            })
          };
        }

        return {
          from: () => ({
            where: () => ({
              limit: async () => [recruitment]
            })
          })
        };
      }
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: dbWithSequentialCount as never });

    assert.ok(interaction._channelSends.length > 0, "channel.send should be called when auto-close triggers");
    const payload = interaction._channelSends[0] ?? "";
    assert.ok(
      payload.includes("closed") || payload.includes("クローズ"),
      `notification should mention close, got: ${payload}`
    );
  });

  it("does not send a channel notification when join succeeds without reaching capacity", async () => {
    // capacity=4, beforeCount=0, afterCount=1 → below capacity → "open"
    const recruitment = makeRecruitment({ capacity: 4, autoClose: true, status: "open" });
    const interaction = makeButtonInteraction({ action: "join" });

    let countCall = 0;
    const db = {
      select: (selection?: Record<string, unknown>) => {
        const isGuildConfig = selection && "language" in selection;
        const isCountQuery = selection && "value" in selection;

        if (isGuildConfig) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({ limit: async () => [] })
              })
            })
          };
        }

        if (isCountQuery) {
          countCall++;
          const val = countCall === 1 ? 0 : 1;
          return {
            from: () => ({
              where: async () => [{ value: val }]
            })
          };
        }

        return {
          from: () => ({
            where: () => ({
              limit: async () => [recruitment]
            })
          })
        };
      },
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: async () => [{ recruitmentId: "recruitment-1", userId: "user-1", joinedAt: new Date(), leftAt: null, updatedAt: new Date() }]
          })
        })
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => [{ ...recruitment, status: "open" }]
          })
        })
      })
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.equal(interaction._channelSends.length, 0, "channel.send should NOT be called when capacity not reached");
  });
});

describe("handleRecruitmentButtonInteraction — leave reopen notification", () => {
  it("sends a channel notification when leave triggers a reopen", async () => {
    // recruitment was auto-closed: status="closed", autoClosed=true, capacity=1
    // after leave: afterCount=0, which is < capacity → shouldReopen = true
    const recruitment = makeRecruitment({
      capacity: 1,
      autoClose: true,
      autoClosed: true,
      status: "closed"
    });
    const interaction = makeButtonInteraction({ action: "leave" });

    const db = makeLeaveDb({ recruitment, afterCount: 0 });

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.ok(interaction._channelSends.length > 0, "channel.send should be called when recruitment reopens");
    const payload = interaction._channelSends[0] ?? "";
    assert.ok(
      payload.includes("reopen") || payload.includes("再オープン"),
      `notification should mention reopen, got: ${payload}`
    );
  });

  it("does not send a channel notification when leave from a non-auto-closed recruitment", async () => {
    // recruitment is open (not auto-closed), leave should not trigger reopen notification
    const recruitment = makeRecruitment({
      capacity: 4,
      autoClose: true,
      autoClosed: false,
      status: "open"
    });
    const interaction = makeButtonInteraction({ action: "leave" });

    const db = makeLeaveDb({ recruitment, afterCount: 2 });

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });

    assert.equal(interaction._channelSends.length, 0, "channel.send should NOT be called when no reopen occurs");
  });
});

describe("recruitmentAutoCloseStatus locale string", () => {
  it("shows ON for enabled auto-close", async () => {
    const { getLocale } = await import("@discord-bot/shared");
    const locEn = getLocale("en");
    const locJa = getLocale("ja");

    assert.match(locEn.recruitmentAutoCloseStatus({ enabled: true }), /ON/);
    assert.match(locEn.recruitmentAutoCloseStatus({ enabled: false }), /OFF/);
    assert.match(locJa.recruitmentAutoCloseStatus({ enabled: true }), /ON/);
    assert.match(locJa.recruitmentAutoCloseStatus({ enabled: false }), /OFF/);
  });
});

function makeSettingsDb(recruitment: ReturnType<typeof makeRecruitment>) {
  return {
    select: (sel?: Record<string, unknown>) => {
      const isGuildConfig = sel && "language" in sel;
      if (isGuildConfig) {
        return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
      }
      return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
    },
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ ...recruitment, autoClose: !recruitment.autoClose }]
        })
      })
    })
  };
}

describe("handleRecruitmentButtonInteraction — settings (non-creator)", () => {
  it("replies with error ephemeral when non-creator presses settings", async () => {
    const recruitment = makeRecruitment({ creatorId: "creator-1" });
    let replied = false;
    const interaction = {
      customId: `recruitment:settings:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "other-user" },
      memberPermissions: { has: () => false },
      reply: async () => { replied = true; }
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: makeSettingsDb(recruitment) as never });
    assert.equal(replied, true);
  });
});

describe("handleRecruitmentButtonInteraction — settings (creator)", () => {
  it("shows toggle button ephemeral when creator presses settings", async () => {
    const recruitment = makeRecruitment({ creatorId: "creator-1", autoClose: true });
    let replyPayload: unknown = null;
    const interaction = {
      customId: `recruitment:settings:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "creator-1" },
      memberPermissions: { has: () => false },
      reply: async (p: unknown) => { replyPayload = p; }
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: makeSettingsDb(recruitment) as never });
    assert.ok(replyPayload !== null);
    const payloadStr = JSON.stringify(replyPayload);
    assert.ok(payloadStr.includes("toggle-auto-close"), "should include toggle-auto-close button customId");
  });
});

describe("handleRecruitmentButtonInteraction — toggle-auto-close", () => {
  it("updates autoClose in DB when creator toggles", async () => {
    const recruitment = makeRecruitment({ creatorId: "creator-1", autoClose: true });
    let updateCalled = false;
    const db = {
      select: (sel?: Record<string, unknown>) => {
        const isGuildConfig = sel && "language" in sel;
        if (isGuildConfig) {
          return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
        }
        return { from: () => ({ where: () => ({ limit: async () => [recruitment] }) }) };
      },
      update: () => ({
        set: (v: Record<string, unknown>) => {
          updateCalled = true;
          return { where: () => ({ returning: async () => [{ ...recruitment, autoClose: v["autoClose"] }] }) };
        }
      })
    };
    const interaction = {
      customId: `recruitment:toggle-auto-close:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "creator-1" },
      memberPermissions: { has: () => false },
      reply: async () => {}
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: db as never });
    assert.equal(updateCalled, true);
  });

  it("replies with error when non-creator presses toggle", async () => {
    const recruitment = makeRecruitment({ creatorId: "creator-1", autoClose: true });
    let replied = false;
    const interaction = {
      customId: `recruitment:toggle-auto-close:${recruitment.id}`,
      guildId: "guild-1",
      user: { id: "other-user" },
      memberPermissions: { has: () => false },
      reply: async () => { replied = true; }
    };

    await handleRecruitmentButtonInteraction(interaction as never, { db: makeSettingsDb(recruitment) as never });
    assert.equal(replied, true);
  });
});
