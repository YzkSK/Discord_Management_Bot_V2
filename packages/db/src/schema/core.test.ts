import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { guildConfigs, ttsDictionaryEntries } from "./core.js";

describe("guildConfigs schema", () => {
  it("exposes a persistent TTS text channel column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;
    assert.notEqual(columns.ttsTextChannelId, undefined);
  });

  it("exposes a language column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;
    assert.notEqual(columns.language, undefined);
  });
});

describe("ttsDictionaryEntries schema", () => {
  it("exposes scope, owner, replacement, priority, and enabled columns", () => {
    const columns = ttsDictionaryEntries as unknown as Record<string, unknown>;

    assert.notEqual(columns.guildId, undefined);
    assert.notEqual(columns.scope, undefined);
    assert.notEqual(columns.userId, undefined);
    assert.notEqual(columns.fromText, undefined);
    assert.notEqual(columns.toText, undefined);
    assert.notEqual(columns.priority, undefined);
    assert.notEqual(columns.isEnabled, undefined);
  });
});
