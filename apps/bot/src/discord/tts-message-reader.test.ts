import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldReadTtsMessage } from "./tts-message-reader.js";

describe("shouldReadTtsMessage", () => {
  it("skips bot messages", () => {
    assert.equal(
      shouldReadTtsMessage({
        authorIsBot: true,
        channelId: "text-1",
        content: "hello",
        readableChannelIds: ["text-1"]
      }),
      false
    );
  });

  it("skips messages outside readable channels", () => {
    assert.equal(
      shouldReadTtsMessage({
        authorIsBot: false,
        channelId: "text-2",
        content: "hello",
        readableChannelIds: ["text-1"]
      }),
      false
    );
  });

  it("reads human text inside readable channels", () => {
    assert.equal(
      shouldReadTtsMessage({
        authorIsBot: false,
        channelId: "text-1",
        content: "hello",
        readableChannelIds: ["text-1"]
      }),
      true
    );
  });
});
