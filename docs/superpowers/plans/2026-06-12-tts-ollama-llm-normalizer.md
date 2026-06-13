# TTS Ollama LLM Normalizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Ollama LLM text normalization layer between `sanitizeTtsText` and VOICEVOX synthesis, with a per-guild `/tts-llm enable|disable` slash command to toggle it.

**Architecture:** The normalizer is wired into `installTtsMessageReader` as an optional `normalizeWithLlm` callback. When `OLLAMA_URL` is set in env, `runtime.ts` creates an Ollama-backed normalizer that checks guild DB settings before calling the LLM. On failure or timeout the original sanitized text is used as fallback.

**Tech Stack:** Ollama HTTP API (`/api/generate`), Drizzle ORM, Node.js `fetch`, in-memory Map cache.

---

## File Map

| Action | File |
|--------|------|
| Modify | `packages/config/src/env.ts` |
| Modify | `packages/db/src/schema/core.ts` |
| Create | `packages/db/drizzle/<timestamp>_tts_llm_enabled.sql` (generated) |
| Create | `packages/db/src/repositories/tts-llm-settings.ts` |
| Modify | `packages/db/src/index.ts` |
| Create | `apps/bot/src/discord/tts-llm-normalizer.ts` |
| Create | `apps/bot/src/discord/tts-llm-normalizer.test.ts` |
| Modify | `apps/bot/src/discord/tts-message-reader.ts` |
| Create | `apps/bot/src/commands/tts-llm.ts` |
| Modify | `apps/bot/src/commands/index.ts` |
| Modify | `apps/bot/src/runtime.ts` |

---

## Task 1: Add Optional Env Vars for Ollama

**Files:**
- Modify: `packages/config/src/env.ts`

- [ ] **Step 1: Add OLLAMA_URL and OLLAMA_MODEL to the Zod schema**

In `packages/config/src/env.ts`, add two optional fields to `appEnvSchema`:

```typescript
export const appEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  VOICEVOX_URL: z.string().url(),
  VOICEVOX_SPEAKER_ID: z.coerce.number().int().nonnegative().default(2),
  OLLAMA_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().default("gemma2:2b"),
  NEXTAUTH_SECRET: z.string().min(1),
  SESSION_ENCRYPTION_KEY: z.string().min(1),
  PUBLIC_DASHBOARD_URL: z.string().url(),
  LOG_LEVEL: logLevelSchema.default("info")
});
```

- [ ] **Step 2: Commit**

```
git add packages/config/src/env.ts
git commit -m "feat(config): add optional OLLAMA_URL and OLLAMA_MODEL env vars"
```

---

## Task 2: Add ttsLlmEnabled Column to DB Schema

**Files:**
- Modify: `packages/db/src/schema/core.ts`

- [ ] **Step 1: Add the column to `guildConfigs`**

In `packages/db/src/schema/core.ts`, add `ttsLlmEnabled` to the `guildConfigs` table definition (after `ttsTextChannelId`):

```typescript
export const guildConfigs = pgTable(
  "guild_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildRefId: uuid("guild_ref_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    logMode: text("log_mode").notNull().default("full"),
    tempVoiceCreateChannelId: text("temp_voice_create_channel_id"),
    tempVoiceCategoryId: text("temp_voice_category_id"),
    ttsTextChannelId: text("tts_text_channel_id"),
    ttsLlmEnabled: boolean("tts_llm_enabled").notNull().default(false), // ← add this
    recruitmentChannelId: text("recruitment_channel_id"),
    language: text("language").notNull().default("en"),
    dashboardManagementRoleIds: text("dashboard_management_role_ids")
      .array()
      .notNull()
      .default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  // ... existing constraints unchanged
```

Also add `boolean` to the existing imports from `drizzle-orm/pg-core` at the top of the file. Check the existing import and add `boolean` if not present:

```typescript
import {
  boolean,   // ← add if not already present
  check,
  index,
  integer,
  pgTable,
  sql,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Generate migration**

```
pnpm --filter @discord-bot/db db:generate
```

Expected: a new `.sql` file in `packages/db/drizzle/` containing `ALTER TABLE "guild_configs" ADD COLUMN "tts_llm_enabled" boolean DEFAULT false NOT NULL;`

- [ ] **Step 3: Apply migration**

```
pnpm --filter @discord-bot/db db:migrate
```

Expected: `✓ migrations applied`

- [ ] **Step 4: Commit**

```
git add packages/db/src/schema/core.ts packages/db/drizzle/
git commit -m "feat(db): add tts_llm_enabled column to guild_configs"
```

---

## Task 3: Add DB Repository for LLM Setting

**Files:**
- Create: `packages/db/src/repositories/tts-llm-settings.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create the repository file**

Create `packages/db/src/repositories/tts-llm-settings.ts`:

```typescript
import { eq } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { guildConfigs, guilds } from "../schema/index.js";

export async function getGuildTtsLlmEnabled(
  db: DbClient,
  { guildId }: { guildId: string }
): Promise<boolean> {
  const result = await db
    .select({ ttsLlmEnabled: guildConfigs.ttsLlmEnabled })
    .from(guildConfigs)
    .innerJoin(guilds, eq(guilds.id, guildConfigs.guildRefId))
    .where(eq(guilds.guildId, guildId))
    .limit(1);

  return result[0]?.ttsLlmEnabled ?? false;
}

export async function setGuildTtsLlmEnabled(
  db: DbClient,
  { guildId, enabled }: { guildId: string; enabled: boolean }
): Promise<void> {
  await db
    .update(guildConfigs)
    .set({ ttsLlmEnabled: enabled })
    .from(guilds)
    .where(
      eq(guilds.id, guildConfigs.guildRefId) &&
      eq(guilds.guildId, guildId)
    );
}
```

> **Note on `setGuildTtsLlmEnabled`:** Drizzle's `.update().from()` syntax is for joining in update. If this doesn't work cleanly with your Drizzle version, use a subquery:
> ```typescript
> const guild = await db
>   .select({ id: guilds.id })
>   .from(guilds)
>   .where(eq(guilds.guildId, guildId))
>   .limit(1);
> if (!guild[0]) return;
> await db
>   .update(guildConfigs)
>   .set({ ttsLlmEnabled: enabled })
>   .where(eq(guildConfigs.guildRefId, guild[0].id));
> ```

- [ ] **Step 2: Export from the package index**

In `packages/db/src/index.ts`, add:

```typescript
export * from "./repositories/tts-llm-settings.js";
```

- [ ] **Step 3: Build the DB package to verify types compile**

```
pnpm --filter @discord-bot/db build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```
git add packages/db/src/repositories/tts-llm-settings.ts packages/db/src/index.ts
git commit -m "feat(db): add getGuildTtsLlmEnabled and setGuildTtsLlmEnabled"
```

---

## Task 4: Create the LLM Normalizer Module

**Files:**
- Create: `apps/bot/src/discord/tts-llm-normalizer.ts`
- Create: `apps/bot/src/discord/tts-llm-normalizer.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `apps/bot/src/discord/tts-llm-normalizer.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createOllamaTextNormalizer,
  type OllamaTextNormalizerOptions
} from "./tts-llm-normalizer.js";

describe("createOllamaTextNormalizer", () => {
  it("returns original text when LLM is disabled for the guild", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async () => false,
      fetchFn: async () => { throw new Error("should not be called"); }
    });

    const result = await normalizer.normalize("テストAI");
    assert.equal(result, "テストAI");
  });

  it("returns normalized text from Ollama when enabled", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async () => true,
      fetchFn: async (_url, _init) => ({
        ok: true,
        json: async () => ({ response: "テストエーアイ" })
      } as Response)
    });

    const result = await normalizer.normalize("テストAI");
    assert.equal(result, "テストエーアイ");
  });

  it("falls back to original text when Ollama returns non-ok response", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async () => true,
      fetchFn: async () => ({ ok: false } as Response)
    });

    const result = await normalizer.normalize("テストAI");
    assert.equal(result, "テストAI");
  });

  it("falls back to original text when fetch throws (e.g. Ollama not running)", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async () => true,
      fetchFn: async () => { throw new Error("connection refused"); }
    });

    const result = await normalizer.normalize("テストAI");
    assert.equal(result, "テストAI");
  });

  it("caches results so Ollama is called only once for the same input", async () => {
    let callCount = 0;
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async () => true,
      fetchFn: async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({ response: "キャッシュテスト" })
        } as Response;
      }
    });

    await normalizer.normalize("同じテキスト");
    await normalizer.normalize("同じテキスト");
    assert.equal(callCount, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
pnpm test --filter @discord-bot/bot 2>&1 | grep "tts-llm-normalizer"
```

Expected: module not found / import error.

- [ ] **Step 3: Create the implementation**

Create `apps/bot/src/discord/tts-llm-normalizer.ts`:

```typescript
const OLLAMA_PROMPT = (text: string) =>
  `あなたはDiscordメッセージをVOICEVOX音声合成用に変換するアシスタントです。
以下のテキストを声に出して読める自然な日本語に変換してください。

ルール:
- 英語略語はアルファベット読みに変換 (例: PC→ピーシー、AI→エーアイ、URL→ユーアールエル)
- 「w」「ww」「www」等は「笑い」に変換
- 「草」は「くさ」に変換
- 記号・顔文字は削除
- 漢字は文脈に合った読み方で自然に読む
- 変換後のテキストのみを出力すること。説明・注釈は不要

テキスト: ${text}`;

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface OllamaTextNormalizerOptions {
  ollamaUrl: string;
  model: string;
  isEnabled: () => Promise<boolean>;
  fetchFn?: FetchFn;
  timeoutMs?: number;
  maxCacheSize?: number;
}

export interface OllamaTextNormalizer {
  normalize: (text: string) => Promise<string>;
}

export function createOllamaTextNormalizer(
  options: OllamaTextNormalizerOptions
): OllamaTextNormalizer {
  const {
    ollamaUrl,
    model,
    isEnabled,
    fetchFn = fetch,
    timeoutMs = 10_000,
    maxCacheSize = 500
  } = options;

  const cache = new Map<string, string>();

  async function normalize(text: string): Promise<string> {
    if (!(await isEnabled())) {
      return text;
    }

    if (cache.has(text)) {
      return cache.get(text)!;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetchFn(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: OLLAMA_PROMPT(text), stream: false }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        return text;
      }

      const data = (await response.json()) as { response: string };
      const normalized = data.response.trim();

      if (cache.size >= maxCacheSize) {
        const firstKey = cache.keys().next().value!;
        cache.delete(firstKey);
      }
      cache.set(text, normalized);

      return normalized;
    } catch {
      return text;
    }
  }

  return { normalize };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

```
pnpm test --filter @discord-bot/bot 2>&1 | grep -A2 "tts-llm-normalizer\|createOllamaTextNormalizer"
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```
git add apps/bot/src/discord/tts-llm-normalizer.ts apps/bot/src/discord/tts-llm-normalizer.test.ts
git commit -m "feat(bot): add Ollama LLM text normalizer with caching and fallback"
```

---

## Task 5: Wire LLM Normalizer into the TTS Pipeline

**Files:**
- Modify: `apps/bot/src/discord/tts-message-reader.ts`
- Modify: `apps/bot/src/discord/tts-message-reader.test.ts`

- [ ] **Step 1: Add `normalizeWithLlm` option to `InstallTtsMessageReaderOptions`**

In `apps/bot/src/discord/tts-message-reader.ts`, extend the interface:

```typescript
export interface InstallTtsMessageReaderOptions {
  db: DbClient;
  loadDictionaryEntries?: (
    input: LoadTtsDictionaryEntriesInput
  ) => Promise<EffectiveTtsDictionaryEntry[]>;
  loadSpeakerId?: (input: LoadTtsSpeakerIdInput) => Promise<number>;
  logWriter: DiscordLogWriter;
  normalizeWithLlm?: (text: string) => Promise<string>; // ← add this
  rateLimiter?: TtsRateLimiter;
  speakerId: number;
  ttsQueue?: TtsPlaybackQueue;
  ttsSessionManager: TtsSessionManager;
  voicevox: VoicevoxClient;
}
```

- [ ] **Step 2: Call LLM normalizer in the pipeline**

In `handleTtsMessage`, find the block after `sanitizeTtsText` and before `applyTtsDictionaryEntries` (around line 345–380). Replace:

```typescript
  const sanitizedText = sanitizeTtsText(normalizedText);
  if (!sanitizedText) {
    // ... skip logging ...
    return;
  }

  const loadDictionaryEntries = ...
```

with:

```typescript
  const sanitizedText = sanitizeTtsText(normalizedText);
  if (!sanitizedText) {
    await options.logWriter.write(
      createTtsMessageSkippedEvent({
        actorId: message.author.id,
        guildId: message.guildId,
        reason: "empty",
        sourceChannelId: message.channelId,
        sourceMessageId: message.id,
        textLength: normalizedText.length,
        voiceChannelId
      })
    );
    return;
  }

  const llmText = options.normalizeWithLlm
    ? await options.normalizeWithLlm(sanitizedText)
    : sanitizedText;

  const loadDictionaryEntries = ...
```

Then replace the `applyTtsDictionaryEntries` call to use `llmText` instead of `sanitizedText`:

```typescript
  const text = applyTtsDictionaryEntries(
    llmText,  // ← was sanitizedText
    await loadDictionaryEntries({
      guildId: message.guildId,
      userId: message.author.id
    })
  );
```

- [ ] **Step 3: Add a test for the LLM path in `handleTtsMessage`**

In `apps/bot/src/discord/tts-message-reader.test.ts`, add inside `describe("handleTtsMessage")`:

```typescript
it("applies LLM normalization when normalizeWithLlm is provided", async () => {
  let synthesizedText = "";

  await handleTtsMessage(
    {
      author: { bot: false, id: "user-1" },
      channelId: "text-1",
      content: "テストAI",
      guildId: "guild-1",
      id: "message-1",
      inGuild: () => true
    } as never,
    {
      db: null as never,
      loadDictionaryEntries: async () => [],
      loadSpeakerId: async () => 2,
      logWriter: { write: async () => {} } as never,
      normalizeWithLlm: async (text) => text.replace("AI", "エーアイ"),
      speakerId: 2,
      ttsSessionManager: {
        getSession: () => ({
          voiceChannelId: "voice-1",
          temporaryChannelIds: []
        })
      } as never,
      voicevox: {
        synthesize: async (text) => {
          synthesizedText = text;
          return Buffer.alloc(0);
        }
      } as never
    }
  );

  assert.equal(synthesizedText, "テストエーアイ");
});
```

- [ ] **Step 4: Run tests**

```
pnpm test --filter @discord-bot/bot 2>&1 | grep -E "handleTtsMessage|✖|✔" | head -20
```

Expected: all `handleTtsMessage` tests pass.

- [ ] **Step 5: Commit**

```
git add apps/bot/src/discord/tts-message-reader.ts apps/bot/src/discord/tts-message-reader.test.ts
git commit -m "feat(bot): wire LLM normalizer into TTS pipeline"
```

---

## Task 6: Create /tts-llm Slash Command

**Files:**
- Create: `apps/bot/src/commands/tts-llm.ts`

- [ ] **Step 1: Create the command file**

Create `apps/bot/src/commands/tts-llm.ts`:

```typescript
import {
  getGuildConfigByGuildId,
  setGuildTtsLlmEnabled,
  type DbClient
} from "@discord-bot/db";
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from "discord.js";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";

export interface TtsLlmCommandContext {
  db: DbClient;
}

export const ttsLlmCommand = new SlashCommandBuilder()
  .setName("tts-llm")
  .setDescription("Toggle LLM-based text normalization for TTS.")
  .setDescriptionLocalization("ja", "TTS読み上げのLLMテキスト正規化を切り替えます。")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("enable")
      .setDescription("Enable LLM normalization for this server.")
      .setDescriptionLocalization("ja", "このサーバーのLLM正規化を有効にします。")
  )
  .addSubcommand((sub) =>
    sub
      .setName("disable")
      .setDescription("Disable LLM normalization for this server.")
      .setDescriptionLocalization("ja", "このサーバーのLLM正規化を無効にします。")
  );

export async function handleTtsLlmCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsLlmCommandContext
) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "エラー",
        lines: ["このコマンドはサーバー内でのみ使用できます。"],
        privateResponse: true
      }),
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const config = await getGuildConfigByGuildId(context.db, guildId);

  if (!config) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "エラー",
        lines: ["サーバーの設定が見つかりません。`/setup`を実行してください。"],
        privateResponse: true
      }),
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const enabled = subcommand === "enable";

  await setGuildTtsLlmEnabled(context.db, { guildId, enabled });

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: "TTS LLM正規化",
      lines: [enabled ? "✅ LLM正規化を有効にしました。" : "⛔ LLM正規化を無効にしました。"],
      privateResponse: true
    }),
    flags: MessageFlags.Ephemeral
  });
}
```

- [ ] **Step 2: Commit**

```
git add apps/bot/src/commands/tts-llm.ts
git commit -m "feat(bot): add /tts-llm enable|disable command"
```

---

## Task 7: Register Command and Wire Ollama into Runtime

**Files:**
- Modify: `apps/bot/src/commands/index.ts`
- Modify: `apps/bot/src/runtime.ts`

- [ ] **Step 1: Register the command in `commands/index.ts`**

In `apps/bot/src/commands/index.ts`, add imports and wire into all three registration points:

```typescript
// add to imports
import {
  handleTtsLlmCommand,
  ttsLlmCommand,
  type TtsLlmCommandContext
} from "./tts-llm.js";

// extend CommandContext type
export type CommandContext = RecruitmentCommandContext &
  SetupCommandContext &
  TtsCommandContext &
  TtsLlmCommandContext & {        // ← add TtsLlmCommandContext
    db: DbClient;
    redis: RedisStreamWriter;
    logWriter?: DiscordLogWriter;
  };

// add to slashCommands array
export const slashCommands = [
  setupCommand,
  recruitmentCommand,
  joinCommand,
  forceJoinCommand,
  leaveCommand,
  speakerCommand,
  ttsLlmCommand          // ← add this
] as const;

// add to handleChatInputCommand switch
case ttsLlmCommand.name:
  await handleTtsLlmCommand(interaction, context);
  return;
```

- [ ] **Step 2: Wire Ollama into `runtime.ts`**

In `apps/bot/src/runtime.ts`, add the import and wire up the normalizer:

```typescript
// add import
import {
  createOllamaTextNormalizer
} from "./discord/tts-llm-normalizer.js";
import { getGuildTtsLlmEnabled } from "@discord-bot/db";

// inside createBotRuntime().start(), after voicevox is created and before installTtsMessageReader:
const ollamaNormalizer = env.OLLAMA_URL
  ? createOllamaTextNormalizer({
      ollamaUrl: env.OLLAMA_URL,
      model: env.OLLAMA_MODEL,
      isEnabled: () =>
        // Note: guildId is not available here - it's passed per-normalize call.
        // See below for correct wiring.
        Promise.resolve(false)
    })
  : undefined;
```

> **Important:** `isEnabled` needs the `guildId` at normalize time, not at setup time.
> Change the approach: instead of `isEnabled` inside the normalizer, pass `guildId` to `normalize`:

Actually, re-read `tts-llm-normalizer.ts` — `isEnabled` is a closure that takes no args. To make it per-guild, update the normalizer signature in Task 4 Step 3:

Change in `tts-llm-normalizer.ts`:
```typescript
export interface OllamaTextNormalizerOptions {
  ollamaUrl: string;
  model: string;
  isEnabled: (guildId: string) => Promise<boolean>;  // ← takes guildId
  fetchFn?: FetchFn;
  timeoutMs?: number;
  maxCacheSize?: number;
}

export interface OllamaTextNormalizer {
  normalize: (text: string, guildId: string) => Promise<string>;  // ← takes guildId
}
```

Update `normalize` internals:
```typescript
async function normalize(text: string, guildId: string): Promise<string> {
  if (!(await isEnabled(guildId))) {
    return text;
  }
  // ... rest unchanged
```

Update tests in `tts-llm-normalizer.test.ts` to pass `"guild-1"` as second arg:
```typescript
const result = await normalizer.normalize("テストAI", "guild-1");
```

Update `InstallTtsMessageReaderOptions.normalizeWithLlm` signature:
```typescript
normalizeWithLlm?: (text: string, guildId: string) => Promise<string>;
```

Update pipeline call in `tts-message-reader.ts`:
```typescript
const llmText = options.normalizeWithLlm
  ? await options.normalizeWithLlm(sanitizedText, message.guildId)
  : sanitizedText;
```

Update test in `tts-message-reader.test.ts`:
```typescript
normalizeWithLlm: async (text, _guildId) => text.replace("AI", "エーアイ"),
```

Now in `runtime.ts`, the correct wiring:

```typescript
import { createOllamaTextNormalizer } from "./discord/tts-llm-normalizer.js";
import { getGuildTtsLlmEnabled } from "@discord-bot/db";

// inside start():
const ollamaNormalizer = env.OLLAMA_URL
  ? createOllamaTextNormalizer({
      ollamaUrl: env.OLLAMA_URL,
      model: env.OLLAMA_MODEL,
      isEnabled: (guildId) =>
        getGuildTtsLlmEnabled(dbConnection!.db, { guildId })
    })
  : undefined;

installTtsMessageReader(discordClient, {
  db: dbConnection.db,
  logWriter,
  speakerId: env.VOICEVOX_SPEAKER_ID,
  ttsSessionManager,
  voicevox,
  normalizeWithLlm: ollamaNormalizer?.normalize.bind(ollamaNormalizer)  // undefined if no Ollama URL
});
```

- [ ] **Step 3: Run all bot tests**

```
pnpm test --filter @discord-bot/bot 2>&1 | tail -10
```

Expected: only the pre-existing `temp-voice-controls` failure; all TTS tests pass.

- [ ] **Step 4: Build to check types**

```
pnpm --filter @discord-bot/bot build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```
git add apps/bot/src/commands/index.ts apps/bot/src/runtime.ts
git commit -m "feat(bot): register /tts-llm command and wire Ollama into runtime"
```

---

## Task 8: Register Commands with Discord

After implementation is done, push updated command payloads to Discord API so the slash command appears in servers.

- [ ] **Step 1: Re-deploy / register commands**

Check how commands are registered in this project (look for a script that calls `REST.put(Routes.applicationCommands(...))`). Run it, or restart the bot in an environment where commands auto-register on startup.

- [ ] **Step 2: Verify in Discord**

Type `/tts-llm` in a server where the bot is present. Confirm `enable` and `disable` subcommands appear.

---

## Verification

1. **Unit tests pass:** `pnpm test --filter @discord-bot/bot` — all new tests green.
2. **LLM disabled by default:** Start bot with `OLLAMA_URL` set. Run `/tts-llm disable` (no-op from default). Speak in voice channel, no Ollama call happens.
3. **Enable LLM:** Run `/tts-llm enable`. Send `AIってすごいwww` in TTS channel. Watch Ollama logs — it receives a request. TTS reads the normalized version.
4. **Ollama offline fallback:** Stop Ollama. Send a message. TTS still works using original sanitized text.
5. **Caching:** Send the same message twice. Check Ollama logs — only one request for both messages.
6. **No Ollama URL:** Start bot without `OLLAMA_URL` set. `/tts-llm enable` still works (sets DB flag), but no Ollama calls are made (normalizer is `undefined`).
