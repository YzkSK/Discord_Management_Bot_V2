import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeTtsText } from "./voicevox.js";

describe("normalizeTtsText", () => {
  it("skips bot-authored messages", () => {
    assert.equal(
      normalizeTtsText({ authorIsBot: true, content: "hello" }),
      null
    );
  });

  it("skips empty and command-like messages", () => {
    assert.equal(normalizeTtsText({ content: "   " }), null);
    assert.equal(normalizeTtsText({ content: "/join" }), null);
  });

  it("trims and collapses readable message text", () => {
    assert.equal(
      normalizeTtsText({ content: "  hello\n\nworld  " }),
      "hello world"
    );
  });

  it("limits overly long text", () => {
    const text = normalizeTtsText({ content: "abcdef", maxLength: 4 });

    assert.equal(text, "abcd");
  });
});
