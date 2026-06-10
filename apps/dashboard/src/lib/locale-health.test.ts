import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDashboardLocale } from "./locale.js";

describe("dashboard health page locale", () => {
  it("provides English and Japanese labels for the system health page", () => {
    const en = getDashboardLocale("en");
    const ja = getDashboardLocale("ja");

    assert.equal(en.healthPageTitle, "System Health");
    assert.equal(en.healthDependencies, "Dependencies");
    assert.equal(en.healthRefresh, "Refresh");
    assert.equal(ja.healthPageTitle, "システム状態");
    assert.equal(ja.healthDependencies, "依存サービス");
    assert.equal(ja.healthRefresh, "再読み込み");
  });
});
