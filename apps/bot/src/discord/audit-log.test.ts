import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NormalizedEvent } from "@discord-bot/shared";

import { applyAuditLog } from "./audit-log.js";

describe("applyAuditLog", () => {
  it("uses the audit log executor as the actor when available", () => {
    const event = createEvent("channel.delete", "old-actor");

    assert.equal(
      applyAuditLog(event, {
        status: "matched",
        actorId: "audit-actor",
        payload: {
          status: "matched",
          executorId: "audit-actor"
        }
      }).actorId,
      "audit-actor"
    );
  });

  it("keeps the original actor when the audit log has no executor", () => {
    const event = createEvent("member.leave", "member-1");
    const enriched = applyAuditLog(event, {
      status: "not_found",
      actorId: null,
      payload: {
        status: "not_found"
      }
    });

    assert.equal(enriched.actorId, "member-1");
    assert.deepEqual(enriched.payload.auditLog, { status: "not_found" });
  });
});

function createEvent(eventName: string, actorId: string): NormalizedEvent {
  return {
    eventName,
    eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
    receivedAt: new Date("2026-05-12T00:00:01.000Z"),
    guildId: "guild-1",
    actorId,
    channelId: null,
    messageId: null,
    payload: {}
  };
}
