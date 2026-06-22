import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getLocale } from "@discord-bot/shared";
import { buildRecruitmentUpdatePayload } from "./message.js";

const loc = getLocale("en");

const BASE_RECRUITMENT = {
  id: "r-1",
  genre: "Apex",
  content: "Ranked tonight",
  creatorId: "user-1",
  voiceChannelId: null,
  capacity: 4,
  deadlineAt: null,
} as const;

describe("buildRecruitmentUpdatePayload", () => {
  it("open: join enabled, close button, no deadline when deadlineAt is null", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: { ...BASE_RECRUITMENT, status: "open" },
      participantIds: ["user-a", "user-b"],
      queuedIds: [],
      loc,
    });

    // flags
    assert.equal((payload as { flags: number }).flags, 1 << 15);

    const actionRow = (payload as { components: unknown[] }).components[1] as {
      components: { custom_id?: string; disabled?: boolean; style: number }[];
    };
    const joinBtn = actionRow.components[0];
    const closeOrReopenBtn = actionRow.components[2];

    assert.equal(joinBtn!.disabled, false, "join should be enabled when open");
    assert.equal(
      closeOrReopenBtn!.custom_id,
      "recruitment:close:r-1",
      "should show close button when open"
    );
    assert.equal(closeOrReopenBtn!.style, 4, "close button style should be DANGER (4)");
  });

  it("closed: join disabled, reopen button shown", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: { ...BASE_RECRUITMENT, status: "closed" },
      participantIds: [],
      queuedIds: [],
      loc,
    });

    const actionRow = (payload as { components: unknown[] }).components[1] as {
      components: { custom_id?: string; disabled?: boolean; style: number }[];
    };
    const joinBtn = actionRow.components[0];
    const closeOrReopenBtn = actionRow.components[2];

    assert.equal(joinBtn!.disabled, true, "join should be disabled when closed");
    assert.equal(
      closeOrReopenBtn!.custom_id,
      "recruitment:reopen:r-1",
      "should show reopen button when closed"
    );
    assert.equal(closeOrReopenBtn!.style, 3, "reopen button style should be SUCCESS (3)");
  });

  it("closed: no deadline text in container", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: {
        ...BASE_RECRUITMENT,
        status: "closed",
        deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      participantIds: [],
      queuedIds: [],
      loc,
    });

    const container = (payload as { components: unknown[] }).components[0] as {
      components: { content?: string }[];
    };
    const hasDeadline = container.components.some(
      (c) => c.content?.includes("Closes") || c.content?.includes("Deadline")
    );
    assert.equal(hasDeadline, false, "closed recruitment should not show deadline");
  });

  it("expired deadline shows 'Expired' text", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: {
        ...BASE_RECRUITMENT,
        status: "open",
        deadlineAt: new Date(0), // far past
      },
      participantIds: [],
      queuedIds: [],
      loc,
    });

    const container = (payload as { components: unknown[] }).components[0] as {
      components: { content?: string }[];
    };
    const hasExpired = container.components.some((c) => c.content === loc.recruitmentPostExpired);
    assert.equal(hasExpired, true, "expired deadline should show expired text");
  });

  it("participants and queue are rendered in content", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: { ...BASE_RECRUITMENT, status: "open" },
      participantIds: ["user-a"],
      queuedIds: ["user-b"],
      loc,
    });

    const container = (payload as { components: unknown[] }).components[0] as {
      components: { content?: string }[];
    };
    const texts = container.components.map((c) => c.content ?? "").join("\n");
    assert.ok(texts.includes("<@user-a>"), "participants should be listed");
    assert.ok(texts.includes("<@user-b>"), "queued users should be listed");
  });
});
