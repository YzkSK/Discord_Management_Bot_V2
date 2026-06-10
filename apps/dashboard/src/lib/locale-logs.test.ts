import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDashboardLocale } from "./locale.js";

describe("dashboard logs UX locale", () => {
  it("provides English and Japanese labels for logs UX", () => {
    const en = getDashboardLocale("en");
    const ja = getDashboardLocale("ja");

    assert.equal(en.logCategoryTabs, "Categories");
    assert.equal(en.humanView, "Human View");
    assert.equal(en.rawJsonRestricted, "Raw JSON is available to admins only.");
    assert.equal(ja.logCategoryTabs, "カテゴリ");
    assert.equal(ja.humanView, "見やすい表示");
    assert.equal(ja.rawJsonRestricted, "Raw JSONはadmin以上のみ表示できます。");
  });
});
