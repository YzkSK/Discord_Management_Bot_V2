# TTS Dashboard Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Dashboard management for TTS dictionary entries, guild default speaker, and user speaker overrides.

**Architecture:** Keep existing guild feature settings in `/api/settings`, and add a focused `/api/tts-settings` endpoint for TTS-specific data. The endpoint uses existing Dashboard RBAC: viewer can read, admin/owner can write. The Settings page extends the current TTS card without restructuring the whole Dashboard.

**Tech Stack:** Next.js route handlers, React client components, TypeScript, Drizzle repository helpers, Node test runner, pnpm, Docker Compose.

---

### Task 1: Validation

**Files:**
- Create: `apps/dashboard/src/app/api/tts-settings/validation.ts`
- Create: `apps/dashboard/src/app/api/tts-settings/validation.test.ts`
- Modify: `apps/dashboard/tsconfig.test.json`

- [ ] **Step 1: Write failing validation tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseTtsDictionaryPatchBody,
  parseTtsDictionaryDeleteBody,
  parseTtsSpeakerPatchBody
} from "./validation.js";

describe("parseTtsSpeakerPatchBody", () => {
  it("accepts guild default speaker updates", () => {
    assert.deepEqual(parseTtsSpeakerPatchBody({
      guildId: " guild-1 ",
      target: "guild-default",
      speakerId: 3
    }), {
      ok: true,
      value: { guildId: "guild-1", target: "guild-default", speakerId: 3 }
    });
  });

  it("accepts user speaker updates", () => {
    assert.deepEqual(parseTtsSpeakerPatchBody({
      guildId: "guild-1",
      target: "user",
      userId: " user-1 ",
      speakerId: 4
    }), {
      ok: true,
      value: { guildId: "guild-1", target: "user", userId: "user-1", speakerId: 4 }
    });
  });

  it("rejects negative speaker ids", () => {
    assert.deepEqual(parseTtsSpeakerPatchBody({
      guildId: "guild-1",
      target: "guild-default",
      speakerId: -1
    }), { ok: false, error: "speakerId must be a non-negative integer." });
  });
});

describe("parseTtsDictionaryPatchBody", () => {
  it("accepts a guild dictionary entry", () => {
    assert.deepEqual(parseTtsDictionaryPatchBody({
      guildId: "guild-1",
      scope: "guild",
      fromText: "API",
      toText: "えーぴーあい",
      priority: 2,
      isEnabled: true
    }), {
      ok: true,
      value: {
        guildId: "guild-1",
        scope: "guild",
        userId: null,
        fromText: "API",
        toText: "えーぴーあい",
        priority: 2,
        isEnabled: true
      }
    });
  });

  it("requires userId for user dictionary entries", () => {
    assert.deepEqual(parseTtsDictionaryPatchBody({
      guildId: "guild-1",
      scope: "user",
      fromText: "API",
      toText: "えーぴーあい"
    }), { ok: false, error: "userId is required for user dictionary entries." });
  });
});

describe("parseTtsDictionaryDeleteBody", () => {
  it("accepts dictionary identity", () => {
    assert.deepEqual(parseTtsDictionaryDeleteBody({
      guildId: "guild-1",
      scope: "guild",
      fromText: "API"
    }), {
      ok: true,
      value: { guildId: "guild-1", scope: "guild", userId: null, fromText: "API" }
    });
  });
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @discord-bot/dashboard test`
Expected: FAIL because the new validation module is missing.

- [ ] **Step 3: Implement validation**

Create parser functions that trim IDs/text, require `guildId`, require non-negative integer `speakerId` and `priority`, accept dictionary `scope` of `guild` or `user`, and require `userId` when scope is `user`.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @discord-bot/dashboard test`
Expected: PASS.

### Task 2: API Route

**Files:**
- Create: `apps/dashboard/src/app/api/tts-settings/route.ts`

- [ ] **Step 1: Implement GET**

GET reads `guildId`, authorizes with required role `viewer`, and returns:

```ts
{
  guildId,
  accessRole,
  dictionaryEntries,
  guildDefaultSpeaker,
  userSpeakers
}
```

Use `listGuildTtsDictionaryEntries`, `getGuildDefaultTtsSpeaker`, and a new DB helper if listing all user speaker settings is needed.

- [ ] **Step 2: Implement PATCH**

PATCH authorizes with required role `admin`. Body supports:

```ts
{ kind: "speaker", guildId, target: "guild-default", speakerId }
{ kind: "speaker", guildId, target: "user", userId, speakerId }
{ kind: "dictionary", guildId, scope, userId?, fromText, toText, priority?, isEnabled? }
```

Use `setGuildDefaultTtsSpeaker`, `setUserTtsSpeaker`, and `ensureTtsDictionaryEntry`.

- [ ] **Step 3: Implement DELETE**

DELETE authorizes with required role `admin`. Body supports:

```ts
{ kind: "speaker", guildId, target: "guild-default" }
{ kind: "speaker", guildId, target: "user", userId }
{ kind: "dictionary", guildId, scope, userId?, fromText }
```

Use `clearGuildDefaultTtsSpeaker`, `clearUserTtsSpeaker`, and `deleteTtsDictionaryEntry`.

### Task 3: Dashboard UI

**Files:**
- Modify: `apps/dashboard/src/app/settings/settings-panel.tsx`
- Modify: `apps/dashboard/src/lib/locale.ts`
- Modify: `apps/dashboard/src/lib/locale.test.ts`

- [ ] **Step 1: Add locale test**

Add assertions for labels such as `ttsDictionary`, `ttsSpeakerDefault`, `ttsUserSpeakers`, `fromText`, `toText`, `speakerId`, and save/delete messages in English and Japanese.

- [ ] **Step 2: Add TTS data fetch**

When settings load, call `/api/tts-settings?guildId=...` and store the response.

- [ ] **Step 3: Extend TTS card**

Add inputs for guild default speaker, user speaker override, and dictionary entries. Disable write buttons when `accessRole === "viewer"`.

- [ ] **Step 4: Wire actions**

Use PATCH/DELETE to save server default speaker, save user speaker, add/update dictionary entries, toggle enabled, and delete dictionary entries.

### Task 4: Docs, Verification, Docker, PR

**Files:**
- Modify: `docs/tts.md`

- [ ] **Step 1: Update docs**

Document Dashboard management for TTS dictionary and speaker settings.

- [ ] **Step 2: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose build bot dashboard
```

- [ ] **Step 3: PR**

Commit with `feat: add TTS dashboard settings`, push `feature/issue-166-tts-dashboard-settings`, open PR to `phase/10-tts-dictionary-safety-speaker`, wait for CI, squash merge, close #166, and fast-forward the local phase branch.
