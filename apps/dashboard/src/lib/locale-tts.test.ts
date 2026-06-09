import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDashboardLocale } from "./locale.js";

describe("dashboard TTS page locale", () => {
  it("provides English and Japanese labels for the TTS dashboard page", () => {
    const en = getDashboardLocale("en");
    const ja = getDashboardLocale("ja");

    assert.equal(en.ttsPageTitle, "TTS");
    assert.equal(en.ttsDictionaryEntries, "Dictionary Entries");
    assert.equal(en.ttsConfiguredStatus, "Configured");
    assert.equal(ja.ttsPageTitle, "TTS");
    assert.equal(ja.ttsDictionaryEntries, "辞書エントリ");
    assert.equal(ja.ttsConfiguredStatus, "設定済み");
  });
});
