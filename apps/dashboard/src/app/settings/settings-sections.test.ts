import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSettingsSectionSummaries } from "./settings-sections.js";

describe("buildSettingsSectionSummaries", () => {
  it("summarizes feature settings into stable sections", () => {
    const summaries = buildSettingsSectionSummaries({
      logs: {
        logMode: "metadata_only",
        language: "ja"
      },
      tempVc: {
        createChannelId: "voice-create-1",
        categoryId: null,
        configured: true
      },
      recruitment: {
        channelId: null,
        configured: false
      },
      tts: {
        textChannelId: "tts-text-1",
        configured: true
      }
    });

    assert.deepEqual(
      summaries.map((summary) => [summary.key, summary.configured]),
      [
        ["logs", true],
        ["tempVc", true],
        ["tts", true],
        ["recruitment", false]
      ]
    );
  });

  it("keeps temp vc unconfigured without a creation channel", () => {
    const [logs, tempVc] = buildSettingsSectionSummaries({
      logs: {
        logMode: "full",
        language: "en"
      },
      tempVc: {
        createChannelId: null,
        categoryId: "category-1",
        configured: false
      },
      recruitment: {
        channelId: null,
        configured: false
      },
      tts: {
        textChannelId: null,
        configured: false
      }
    });

    assert.equal(logs?.configured, true);
    assert.equal(tempVc?.configured, false);
  });
});
