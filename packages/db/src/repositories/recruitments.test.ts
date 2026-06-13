import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveRecruitmentStatus,
  updateRecruitmentAutoClose
} from "./recruitments.js";

describe("resolveRecruitmentStatus", () => {
  it("keeps closed recruitments closed", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 1,
        autoClose: true,
        currentStatus: "closed"
      }),
      "closed"
    );
  });

  it("auto-closes when capacity is reached and auto close is enabled", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 3,
        autoClose: true
      }),
      "closed"
    );
  });

  it("marks full when capacity is reached and auto close is disabled", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 3,
        autoClose: false
      }),
      "full"
    );
  });

  it("opens when participant count is below capacity", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 2,
        autoClose: true
      }),
      "open"
    );
  });
});

describe("updateRecruitmentAutoClose", () => {
  it("calls update with the new autoClose value", async () => {
    let capturedSet: Record<string, unknown> | null = null;
    const db = {
      update: () => ({
        set: (values: Record<string, unknown>) => {
          capturedSet = values;
          return {
            where: () => ({
              returning: async () => [{ id: "r1", autoClose: false } as never]
            })
          };
        }
      })
    } as never;

    const result = await updateRecruitmentAutoClose(db, {
      recruitmentId: "r1",
      autoClose: false
    });

    assert.equal((result as any)?.id, "r1");
    assert.equal((capturedSet as any)?.autoClose, false);
  });
});
