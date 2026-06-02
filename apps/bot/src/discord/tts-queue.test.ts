import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LocalTtsPlaybackQueue } from "./tts-queue.js";

describe("LocalTtsPlaybackQueue", () => {
  it("runs jobs for the same guild sequentially", async () => {
    const queue = new LocalTtsPlaybackQueue();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue({ guildId: "guild-1" }, async () => {
      events.push("first:start");
      await firstCanFinish;
      events.push("first:end");
    });
    const second = queue.enqueue({ guildId: "guild-1" }, async () => {
      events.push("second:start");
    });

    await waitUntil(() => events.includes("first:start"));
    assert.deepEqual(events, ["first:start"]);

    releaseFirst();
    await Promise.all([first, second]);

    assert.deepEqual(events, ["first:start", "first:end", "second:start"]);
  });

  it("runs jobs for different guilds independently", async () => {
    const queue = new LocalTtsPlaybackQueue();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue({ guildId: "guild-1" }, async () => {
      events.push("guild-1:start");
      await firstCanFinish;
      events.push("guild-1:end");
    });
    const second = queue.enqueue({ guildId: "guild-2" }, async () => {
      events.push("guild-2:start");
    });

    await second;
    assert.deepEqual(events, ["guild-1:start", "guild-2:start"]);

    releaseFirst();
    await first;
  });
});

async function waitUntil(predicate: () => boolean) {
  for (let i = 0; i < 10; i += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
}
