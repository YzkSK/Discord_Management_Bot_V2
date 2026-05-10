import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldSkipMessageLog } from "./message-logs.js";

describe("shouldSkipMessageLog", () => {
  it("skips bot-authored messages", () => {
    assert.equal(
      shouldSkipMessageLog({ author: { bot: true } } as never),
      true
    );
  });

  it("keeps human-authored messages", () => {
    assert.equal(
      shouldSkipMessageLog({ author: { bot: false } } as never),
      false
    );
  });

  it("keeps partial messages without author data", () => {
    assert.equal(shouldSkipMessageLog({ author: null } as never), false);
  });
});
