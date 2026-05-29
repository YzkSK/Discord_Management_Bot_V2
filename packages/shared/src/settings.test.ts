import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDashboardSettingsFeatures } from "./settings.js";

describe("buildDashboardSettingsFeatures", () => {
  it("groups guild config settings by feature domain", () => {
    assert.deepEqual(
      buildDashboardSettingsFeatures({
        logMode: "metadata_only",
        language: "ja",
        tempVoiceCreateChannelId: "voice-create-1",
        tempVoiceCategoryId: "category-1",
        ttsTextChannelId: "tts-text-1"
      }),
      {
        logs: {
          logMode: "metadata_only",
          language: "ja"
        },
        tempVc: {
          createChannelId: "voice-create-1",
          categoryId: "category-1",
          configured: true
        },
        recruitment: {
          channelMarker: "[discord-management-bot:recruitment]",
          configured: false
        },
        tts: {
          textChannelId: "tts-text-1",
          configured: true
        }
      }
    );
  });

  it("marks optional feature settings as unconfigured when ids are missing", () => {
    const features = buildDashboardSettingsFeatures({
      logMode: "full",
      language: "en",
      tempVoiceCreateChannelId: null,
      tempVoiceCategoryId: null,
      ttsTextChannelId: null
    });

    assert.equal(features.tempVc.configured, false);
    assert.equal(features.tts.configured, false);
  });
});
