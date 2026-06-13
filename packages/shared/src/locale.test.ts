import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getLocale, isGuildLanguage } from "./locale.js";

describe("isGuildLanguage", () => {
  it("returns true for en", () => {
    assert.equal(isGuildLanguage("en"), true);
  });

  it("returns true for ja", () => {
    assert.equal(isGuildLanguage("ja"), true);
  });

  it("returns false for unknown values", () => {
    assert.equal(isGuildLanguage("fr"), false);
    assert.equal(isGuildLanguage(""), false);
  });
});

describe("getLocale('en')", () => {
  it("returns English log title", () => {
    const loc = getLocale("en");
    assert.equal(loc.logTitle({ eventName: "message.create" }), "Log: message.create");
  });

  it("returns English actor unknown", () => {
    assert.equal(getLocale("en").logActorUnknown, "Actor: unknown");
  });
});

describe("getLocale('ja')", () => {
  it("returns Japanese log title", () => {
    const loc = getLocale("ja");
    assert.equal(loc.logTitle({ eventName: "message.create" }), "ログ: message.create");
  });

  it("returns Japanese actor unknown", () => {
    assert.equal(getLocale("ja").logActorUnknown, "アクター: 不明");
  });

  it("interpolates actor id in Japanese", () => {
    const loc = getLocale("ja");
    assert.equal(loc.logActor({ actorId: "123" }), "アクター: <@123>");
  });

  it("interpolates channel id in Japanese force-join message", () => {
    const loc = getLocale("ja");
    assert.equal(loc.ttsForceJoinMoveTo({ id: "456" }), "→ <#456> に移動しますか？");
  });
});
