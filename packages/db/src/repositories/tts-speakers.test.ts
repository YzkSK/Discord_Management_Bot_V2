import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isUserTtsSpeakerSetting,
  normalizeTtsSpeakerSettingInput,
  resolveTtsSpeakerId
} from "./tts-speakers.js";

describe("normalizeTtsSpeakerSettingInput", () => {
  it("normalizes a guild default speaker setting", () => {
    assert.deepEqual(
      normalizeTtsSpeakerSettingInput({
        guildId: " guild-1 ",
        speakerId: 2
      }),
      {
        guildId: "guild-1",
        speakerId: 2,
        userId: null
      }
    );
  });

  it("normalizes a user speaker override", () => {
    assert.deepEqual(
      normalizeTtsSpeakerSettingInput({
        guildId: " guild-1 ",
        speakerId: 3,
        userId: " user-1 "
      }),
      {
        guildId: "guild-1",
        speakerId: 3,
        userId: "user-1"
      }
    );
  });

  it("rejects negative speaker ids", () => {
    assert.throws(
      () =>
        normalizeTtsSpeakerSettingInput({
          guildId: "guild-1",
          speakerId: -1
        }),
      /speakerId must be a non-negative integer/
    );
  });
});

describe("resolveTtsSpeakerId", () => {
  it("prefers user override over guild default and fallback", () => {
    assert.equal(
      resolveTtsSpeakerId({
        fallbackSpeakerId: 1,
        guildDefaultSpeakerId: 2,
        userSpeakerId: 3
      }),
      3
    );
  });

  it("falls back to guild default before env fallback", () => {
    assert.equal(
      resolveTtsSpeakerId({
        fallbackSpeakerId: 1,
        guildDefaultSpeakerId: 2,
        userSpeakerId: null
      }),
      2
    );
  });

  it("uses fallback when no settings exist", () => {
    assert.equal(
      resolveTtsSpeakerId({
        fallbackSpeakerId: 1,
        guildDefaultSpeakerId: null,
        userSpeakerId: null
      }),
      1
    );
  });
});

describe("isUserTtsSpeakerSetting", () => {
  it("keeps settings with a user id", () => {
    assert.equal(
      isUserTtsSpeakerSetting({
        userId: "user-1"
      }),
      true
    );
  });

  it("rejects guild default settings", () => {
    assert.equal(
      isUserTtsSpeakerSetting({
        userId: null
      }),
      false
    );
  });
});
