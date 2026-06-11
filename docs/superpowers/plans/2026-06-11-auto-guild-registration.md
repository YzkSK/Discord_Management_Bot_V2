# Auto Guild Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-register guilds in the DB when the bot starts up and when it joins new guilds, so users can access the dashboard without running `/setup` first.

**Architecture:** Add a new `guild-registration.ts` handler module that listens to `ClientReady` (bulk-registers all cached guilds) and `GuildCreate` (registers newly joined guilds). Both use `ensureGuildSetup` which is already an idempotent upsert. Inner logic functions accept an injected setup function so they can be unit-tested without module mocking. Wire the handler into `runtime.ts`.

**Tech Stack:** discord.js `Events.ClientReady` / `Events.GuildCreate`, `@discord-bot/db` `ensureGuildSetup`, Node.js `node:test` + `node:assert/strict` for tests.

---

### Task 1: Write failing tests for guild-registration logic

**Files:**
- Create: `apps/bot/src/discord/guild-registration.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// apps/bot/src/discord/guild-registration.test.ts
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
```

- [ ] **Step 2: Add the test file to package.json test script**

Open `apps/bot/package.json`. In the `"test"` script, append `dist/discord/guild-registration.test.js` to the end of the `node --test` argument list:

```json
"test": "tsc -p tsconfig.json && node --test dist/commands/setup.test.js dist/commands/tts.test.js dist/discord/audit-log.test.js dist/discord/components-v2.test.js dist/discord/dashboard-access.test.js dist/discord/gateway-logs.test.js dist/discord/guild-registration.test.js dist/discord/log-channel.test.js dist/discord/message-logs.test.js dist/discord/recruitment-channel.test.js dist/discord/recruitment-logs.test.js dist/discord/temp-voice-controls.test.js dist/discord/temp-voice.test.js dist/discord/tts-auto-leave.test.js dist/discord/tts-logs.test.js dist/discord/tts-message-reader.test.js dist/discord/tts-queue.test.js dist/discord/tts-session.test.js dist/discord/voice-activity.test.js dist/discord/voice-state.test.js dist/discord/voice-status-channel.test.js dist/discord/voicevox.test.js"
```

- [ ] **Step 3: Attempt to run tests — expect compile failure**

```bash
cd apps/bot && pnpm test
```

Expected: TypeScript compile error — `guild-registration.js` not found / `handleClientReady` not exported.

---

### Task 2: Implement guild-registration.ts

**Files:**
- Create: `apps/bot/src/discord/guild-registration.ts`

- [ ] **Step 1: Create the implementation file**

```typescript
// apps/bot/src/discord/guild-registration.ts
import type { DbClient, EnsureGuildSetupInput } from "@discord-bot/db";
import { ensureGuildSetup } from "@discord-bot/db";
import { Events, type Client } from "discord.js";

type SetupFn = (db: DbClient, input: EnsureGuildSetupInput) => Promise<unknown>;

export async function handleClientReady(
  db: DbClient,
  cache: Iterable<[unknown, { id: string; name: string }]>,
  setup: SetupFn = ensureGuildSetup
): Promise<void> {
  for (const [, guild] of cache) {
    await setup(db, { guildId: guild.id, name: guild.name }).catch((error: unknown) => {
      console.warn("failed to register guild on startup", { guildId: guild.id, error });
    });
  }
}

export async function handleGuildCreate(
  db: DbClient,
  guild: { id: string; name: string },
  setup: SetupFn = ensureGuildSetup
): Promise<void> {
  await setup(db, { guildId: guild.id, name: guild.name }).catch((error: unknown) => {
    console.warn("failed to register guild on join", { guildId: guild.id, error });
  });
}

export function installGuildRegistrationHandlers(
  client: Client,
  options: { db: DbClient }
) {
  client.once(Events.ClientReady, (readyClient) => {
    void handleClientReady(options.db, readyClient.guilds.cache);
  });

  client.on(Events.GuildCreate, (guild) => {
    void handleGuildCreate(options.db, guild);
  });
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd apps/bot && pnpm test
```

Expected: all tests pass, including the 4 new `guild-registration` tests.

- [ ] **Step 3: Commit**

```bash
git add apps/bot/src/discord/guild-registration.ts apps/bot/src/discord/guild-registration.test.ts apps/bot/package.json
git commit -m "feat(bot): auto-register guilds on startup and join"
```

---

### Task 3: Wire handler into runtime.ts

**Files:**
- Modify: `apps/bot/src/runtime.ts`

- [ ] **Step 1: Add import and handler call to runtime.ts**

In `apps/bot/src/runtime.ts`, add the import after the existing discord import block:

```typescript
import { installGuildRegistrationHandlers } from "./discord/guild-registration.js";
```

Then add the handler call immediately after `installDiscordLifecycleLogging(discordClient)`:

```typescript
installDiscordLifecycleLogging(discordClient);
installGuildRegistrationHandlers(discordClient, { db: dbConnection.db });
```

- [ ] **Step 2: Typecheck to verify no errors**

```bash
cd apps/bot && pnpm typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run full test suite**

```bash
cd apps/bot && pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/bot/src/runtime.ts
git commit -m "feat(bot): wire guild registration handler into runtime"
```
