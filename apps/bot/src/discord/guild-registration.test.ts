import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  handleClientReady,
  handleGuildCreate
} from "./guild-registration.js";

describe("handleClientReady", () => {
  it("calls setup for every guild in cache", async () => {
    const calls: { guildId: string; name: string | null }[] = [];
    const fakeSetup = async (_db: unknown, input: { guildId: string; name: string | null }) => {
      calls.push(input);
    };

    const cache = new Map([
      ["guild-1", { id: "guild-1", name: "Server One" }],
      ["guild-2", { id: "guild-2", name: "Server Two" }]
    ]);

    await handleClientReady({} as never, cache, fakeSetup);

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], { guildId: "guild-1", name: "Server One" });
    assert.deepEqual(calls[1], { guildId: "guild-2", name: "Server Two" });
  });

  it("continues processing remaining guilds when one setup call throws", async () => {
    const calls: string[] = [];
    let callCount = 0;
    const fakeSetup = async (_db: unknown, input: { guildId: string; name: string | null }) => {
      callCount++;
      if (callCount === 1) throw new Error("DB error");
      calls.push(input.guildId);
    };

    const cache = new Map([
      ["guild-1", { id: "guild-1", name: "Server One" }],
      ["guild-2", { id: "guild-2", name: "Server Two" }]
    ]);

    await assert.doesNotReject(() => handleClientReady({} as never, cache, fakeSetup));
    assert.deepEqual(calls, ["guild-2"]);
  });
});

describe("handleGuildCreate", () => {
  it("calls setup with the joined guild", async () => {
    const calls: { guildId: string; name: string | null }[] = [];
    const fakeSetup = async (_db: unknown, input: { guildId: string; name: string | null }) => {
      calls.push(input);
    };

    await handleGuildCreate({} as never, { id: "guild-3", name: "New Server" }, fakeSetup);

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { guildId: "guild-3", name: "New Server" });
  });

  it("does not throw when setup call fails", async () => {
    const fakeSetup = async () => {
      throw new Error("DB error");
    };

    await assert.doesNotReject(() =>
      handleGuildCreate({} as never, { id: "guild-3", name: "New Server" }, fakeSetup)
    );
  });
});
