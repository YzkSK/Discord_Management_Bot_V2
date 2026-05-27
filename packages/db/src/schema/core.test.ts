import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { guildConfigs } from "./core.js";

describe("guildConfigs schema", () => {
  it("exposes a persistent TTS text channel column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;

    assert.notEqual(columns.ttsTextChannelId, undefined);
  });
});
