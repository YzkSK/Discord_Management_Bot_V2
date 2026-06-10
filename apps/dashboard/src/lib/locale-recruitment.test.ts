import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDashboardLocale } from "./locale.js";

describe("dashboard recruitment locale", () => {
  it("provides English and Japanese labels for recruitment dashboard", () => {
    const en = getDashboardLocale("en");
    const ja = getDashboardLocale("ja");

    assert.equal(en.recruitmentPageTitle, "Recruitment");
    assert.equal(en.recruitmentOpen, "Open");
    assert.equal(ja.recruitmentPageTitle, "募集");
    assert.equal(ja.recruitmentOpen, "募集中");
  });
});
