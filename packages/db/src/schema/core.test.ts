import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  callSessions,
  guildConfigs,
  ttsDictionaryEntries,
  ttsSpeakerSettings
} from "./core.js";

describe("guildConfigs schema", () => {
  it("exposes a persistent TTS text channel column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;
    assert.notEqual(columns.ttsTextChannelId, undefined);
  });

  it("exposes a recruitment channel id column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;
    assert.notEqual(columns.recruitmentChannelId, undefined);
  });

  it("exposes a language column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;
    assert.notEqual(columns.language, undefined);
  });
});

describe("callSessions schema", () => {
  it("exposes a status message id column for voice status rendering", () => {
    const columns = callSessions as unknown as Record<string, unknown>;

    assert.notEqual(columns.statusMessageId, undefined);
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

describe("ttsSpeakerSettings schema", () => {
  it("exposes guild, optional user, and speaker id columns", () => {
    assert.ok(ttsSpeakerSettings.guildId);
    assert.ok(ttsSpeakerSettings.userId);
    assert.ok(ttsSpeakerSettings.speakerId);
  });
});
