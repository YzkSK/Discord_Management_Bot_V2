import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDashboardLocale } from "./locale.js";

describe("dashboard access locale", () => {
  it("provides English labels for access grant management", () => {
    const loc = getDashboardLocale("en");

    assert.equal(loc.accessGrantTarget, "Target");
    assert.equal(loc.accessGrantSaved, "Dashboard access grant saved.");
    assert.equal(loc.noAccessGrants, "No explicit dashboard access grants.");
  });

  it("provides Japanese labels for access grant management", () => {
    const loc = getDashboardLocale("ja");

    assert.equal(loc.accessGrantTarget, "対象");
    assert.equal(loc.accessGrantSaved, "ダッシュボードアクセス権限を保存しました。");
    assert.equal(loc.noAccessGrants, "明示的なダッシュボードアクセス権限はありません。");
  });

  it("provides English and Japanese labels for feature settings", () => {
    assert.equal(getDashboardLocale("en").settingsOverview, "Overview");
    assert.equal(getDashboardLocale("en").tempVcSettings, "Temp VC");
    assert.equal(getDashboardLocale("ja").settingsOverview, "概要");
    assert.equal(getDashboardLocale("ja").tempVcSettings, "一時VC");
  });
});
