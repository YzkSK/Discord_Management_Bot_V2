import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cn } from "./utils.js";

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    assert.equal(cn("px-2", false && "hidden", "px-4"), "px-4");
  });
});
