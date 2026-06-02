import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseTtsDictionaryDeleteBody,
  parseTtsDictionaryPatchBody,
  parseTtsSpeakerDeleteBody,
  parseTtsSpeakerPatchBody
} from "./validation.js";

describe("parseTtsSpeakerPatchBody", () => {
  it("accepts guild default speaker updates", () => {
    assert.deepEqual(
      parseTtsSpeakerPatchBody({
        guildId: " guild-1 ",
        kind: "speaker",
        speakerId: 3,
        target: "guild-default"
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          kind: "speaker",
          speakerId: 3,
          target: "guild-default"
        }
      }
    );
  });

  it("accepts user speaker updates", () => {
    assert.deepEqual(
      parseTtsSpeakerPatchBody({
        guildId: "guild-1",
        kind: "speaker",
        speakerId: 4,
        target: "user",
        userId: " user-1 "
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          kind: "speaker",
          speakerId: 4,
          target: "user",
          userId: "user-1"
        }
      }
    );
  });

  it("rejects negative speaker ids", () => {
    assert.deepEqual(
      parseTtsSpeakerPatchBody({
        guildId: "guild-1",
        kind: "speaker",
        speakerId: -1,
        target: "guild-default"
      }),
      { ok: false, error: "speakerId must be a non-negative integer." }
    );
  });
});

describe("parseTtsSpeakerDeleteBody", () => {
  it("accepts user speaker delete requests", () => {
    assert.deepEqual(
      parseTtsSpeakerDeleteBody({
        guildId: "guild-1",
        kind: "speaker",
        target: "user",
        userId: "user-1"
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          kind: "speaker",
          target: "user",
          userId: "user-1"
        }
      }
    );
  });
});

describe("parseTtsDictionaryPatchBody", () => {
  it("accepts a guild dictionary entry", () => {
    assert.deepEqual(
      parseTtsDictionaryPatchBody({
        fromText: " API ",
        guildId: "guild-1",
        isEnabled: true,
        kind: "dictionary",
        priority: 2,
        scope: "guild",
        toText: "えーぴーあい"
      }),
      {
        ok: true,
        value: {
          fromText: "API",
          guildId: "guild-1",
          isEnabled: true,
          kind: "dictionary",
          priority: 2,
          scope: "guild",
          toText: "えーぴーあい",
          userId: null
        }
      }
    );
  });

  it("requires userId for user dictionary entries", () => {
    assert.deepEqual(
      parseTtsDictionaryPatchBody({
        fromText: "API",
        guildId: "guild-1",
        kind: "dictionary",
        scope: "user",
        toText: "えーぴーあい"
      }),
      { ok: false, error: "userId is required for user dictionary entries." }
    );
  });
});

describe("parseTtsDictionaryDeleteBody", () => {
  it("accepts dictionary identity", () => {
    assert.deepEqual(
      parseTtsDictionaryDeleteBody({
        fromText: "API",
        guildId: "guild-1",
        kind: "dictionary",
        scope: "guild"
      }),
      {
        ok: true,
        value: {
          fromText: "API",
          guildId: "guild-1",
          kind: "dictionary",
          scope: "guild",
          userId: null
        }
      }
    );
  });
});
