// apps/dashboard/src/lib/event-display.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatEventDescription,
  getEventColor,
  formatRelativeTime,
} from "./event-display.js";

describe("formatEventDescription", () => {
  it("voice.session.join → actor/channel 入り", () => {
    const result = formatEventDescription("voice.session.join", {
      actorId: "111",
      channelId: "222",
    });
    assert.ok(result.includes("<@111>"), `expected mention, got: ${result}`);
    assert.ok(result.includes("<#222>"), `expected channel, got: ${result}`);
  });

  it("member.kick → actor 入り", () => {
    const result = formatEventDescription("member.kick", { actorId: "333" });
    assert.ok(result.includes("<@333>"), `expected mention, got: ${result}`);
  });

  it("未知イベントは eventName をそのまま返す", () => {
    const result = formatEventDescription("unknown.event", {});
    assert.equal(result, "unknown.event");
  });
});

describe("getEventColor", () => {
  it("voice 系は purple", () => {
    assert.equal(getEventColor("voice.session.join"), "purple");
  });
  it("system 系は red", () => {
    assert.equal(getEventColor("system.bot.crashed"), "red");
  });
  it("message 系は blue", () => {
    assert.equal(getEventColor("message.delete"), "blue");
  });
});

describe("formatRelativeTime", () => {
  it("1分前", () => {
    const d = new Date(Date.now() - 60 * 1000);
    assert.equal(formatRelativeTime(d), "1分前");
  });
  it("2時間前", () => {
    const d = new Date(Date.now() - 2 * 60 * 60 * 1000);
    assert.equal(formatRelativeTime(d), "2時間前");
  });
  it("30秒前", () => {
    const d = new Date(Date.now() - 30 * 1000);
    assert.equal(formatRelativeTime(d), "30秒前");
  });
});
