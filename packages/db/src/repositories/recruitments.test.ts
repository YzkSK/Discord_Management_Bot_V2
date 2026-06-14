import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRecruitmentStatus } from "./recruitments.js";

describe("resolveRecruitmentStatus", () => {
  it("keeps closed recruitments closed", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 1,
        currentStatus: "closed"
      }),
      "closed"
    );
  });

  it("marks full when capacity is reached", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 3
      }),
      "full"
    );
  });

  it("opens when participant count is below capacity", () => {
    assert.equal(
      resolveRecruitmentStatus({
        capacity: 3,
        activeParticipantCount: 2
      }),
      "open"
    );
  });
});
