import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeTtsDictionaryEntryInput,
  sortEffectiveTtsDictionaryEntries
} from "./tts-dictionary.js";

describe("normalizeTtsDictionaryEntryInput", () => {
  it("normalizes a guild dictionary entry", () => {
    assert.deepEqual(
      normalizeTtsDictionaryEntryInput({
        guildId: " guild-1 ",
        scope: "guild",
        fromText: "  hello  ",
        toText: "  hi  ",
        priority: 3
      }),
      {
        guildId: "guild-1",
        scope: "guild",
        userId: null,
        fromText: "hello",
        toText: "hi",
        priority: 3,
        isEnabled: true
      }
    );
  });

  it("requires a user id for user dictionary entries", () => {
    assert.throws(
      () =>
        normalizeTtsDictionaryEntryInput({
          guildId: "guild-1",
          scope: "user",
          fromText: "hello",
          toText: "hi"
        }),
      /userId is required/
    );
  });
});

describe("sortEffectiveTtsDictionaryEntries", () => {
  it("orders enabled user entries before guild entries, then by priority", () => {
    assert.deepEqual(
      sortEffectiveTtsDictionaryEntries([
        {
          scope: "guild",
          fromText: "a",
          toText: "A",
          priority: 100,
          isEnabled: true
        },
        {
          scope: "user",
          fromText: "b",
          toText: "B",
          priority: 1,
          isEnabled: true
        },
        {
          scope: "user",
          fromText: "c",
          toText: "C",
          priority: 99,
          isEnabled: false
        }
      ]).map((entry) => entry.fromText),
      ["b", "a"]
    );
  });
});
