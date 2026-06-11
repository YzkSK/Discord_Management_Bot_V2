// apps/dashboard/src/lib/event-display.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatEventDescription,
  getActorText,
  splitDescriptionOnActor,
  getEventColor,
  getEventIcon,
  formatRelativeTime,
} from "./event-display.js";

describe("formatEventDescription", () => {
  it("voice.session.join with actorId/channelId → truncated id display", () => {
    const result = formatEventDescription("voice.session.join", {
      actorId: "111",
      channelId: "222",
    });
    assert.ok(result.includes("@111"), `expected actor id, got: ${result}`);
    assert.ok(result.includes("#222"), `expected channel id, got: ${result}`);
  });

  it("voice.session.join with actorName/channelName → name display", () => {
    const result = formatEventDescription("voice.session.join", {
      actorId: "111",
      actorName: "Yuzuki",
      channelId: "222",
      channelName: "general",
    });
    assert.ok(result.includes("@Yuzuki"), `expected actor name, got: ${result}`);
    assert.ok(result.includes("#general"), `expected channel name, got: ${result}`);
  });

  it("member.kick → actor 入り", () => {
    const result = formatEventDescription("member.kick", { actorId: "333" });
    assert.ok(result.includes("@333"), `expected actor id, got: ${result}`);
  });

  it("member.kick with actorName → name display", () => {
    const result = formatEventDescription("member.kick", { actorName: "BadUser" });
    assert.ok(result.includes("@BadUser"), `expected actor name, got: ${result}`);
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

describe("getEventIcon", () => {
  it("known event → emoji", () => {
    const icon = getEventIcon("voice.session.join");
    assert.equal(icon, "🎤");
  });
  it("unknown event → 📋", () => {
    assert.equal(getEventIcon("unknown.xyz"), "📋");
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

describe("formatRelativeTime boundaries", () => {
  it("59秒前", () => {
    const d = new Date(Date.now() - 59 * 1000);
    assert.equal(formatRelativeTime(d), "59秒前");
  });
  it("60秒 → 1分前", () => {
    const d = new Date(Date.now() - 60 * 1000);
    assert.equal(formatRelativeTime(d), "1分前");
  });
  it("3599秒 → 59分前", () => {
    const d = new Date(Date.now() - 3599 * 1000);
    assert.equal(formatRelativeTime(d), "59分前");
  });
  it("3600秒 → 1時間前", () => {
    const d = new Date(Date.now() - 3600 * 1000);
    assert.equal(formatRelativeTime(d), "1時間前");
  });
  it("86400秒 → 1日前", () => {
    const d = new Date(Date.now() - 86400 * 1000);
    assert.equal(formatRelativeTime(d), "1日前");
  });
});

describe("formatEventDescription — default vars", () => {
  it("called without vars still works", () => {
    const result = formatEventDescription("guild.update");
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });
});

describe("getActorText", () => {
  it("actorName がある場合は @actorName を返す", () => {
    assert.equal(getActorText({ actorName: "Yuzuki" }), "@Yuzuki");
  });

  it("actorName がなく actorId がある場合は先頭8文字 + … を返す", () => {
    assert.equal(getActorText({ actorId: "123456789012345678" }), "@12345678…");
  });

  it("どちらもない場合は null を返す", () => {
    assert.equal(getActorText({}), null);
  });

  it("actorName が null で actorId がある場合は actorId ベースを返す", () => {
    assert.equal(getActorText({ actorId: "111222333", actorName: null }), "@11122233…");
  });
});

describe("splitDescriptionOnActor", () => {
  it("アクターテキストが含まれる場合に before/after で分割する", () => {
    const result = splitDescriptionOnActor("🎤 @Yuzuki が参加", "@Yuzuki");
    assert.deepEqual(result, { before: "🎤 ", after: " が参加" });
  });

  it("アクターテキストが含まれない場合は null を返す", () => {
    const result = splitDescriptionOnActor("🗑️ メッセージを削除", "@Yuzuki");
    assert.equal(result, null);
  });

  it("先頭にアクターテキストがある場合", () => {
    const result = splitDescriptionOnActor("@Yuzuki がログイン", "@Yuzuki");
    assert.deepEqual(result, { before: "", after: " がログイン" });
  });
});
