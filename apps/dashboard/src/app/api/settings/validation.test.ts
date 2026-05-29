import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSettingsPatchBody } from "./validation.js";

describe("parseSettingsPatchBody", () => {
  it("accepts the legacy logs settings payload", () => {
    assert.deepEqual(
      parseSettingsPatchBody({
        guildId: " guild-1 ",
        logMode: "metadata_only",
        language: "ja"
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          section: "logs",
          values: {
            logMode: "metadata_only",
            language: "ja"
          }
        }
      }
    );
  });

  it("accepts a feature scoped temp vc settings payload", () => {
    assert.deepEqual(
      parseSettingsPatchBody({
        guildId: "guild-1",
        section: "tempVc",
        values: {
          createChannelId: " voice-create-1 ",
          categoryId: null
        }
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          section: "tempVc",
          values: {
            createChannelId: "voice-create-1",
            categoryId: null
          }
        }
      }
    );
  });

  it("rejects unsupported recruitment writes until a persisted setting exists", () => {
    assert.deepEqual(
      parseSettingsPatchBody({
        guildId: "guild-1",
        section: "recruitment",
        values: {}
      }),
      { ok: false, error: "Recruitment settings are read-only for now." }
    );
  });
});
