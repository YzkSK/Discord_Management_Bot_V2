# Bot UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 usability issues across the Discord bot and dashboard while removing the unused Ollama LLM integration entirely.

**Architecture:** Changes span three layers — the Discord bot command handlers (`apps/bot`), the shared locale system (`packages/shared`), and the dashboard UI (`apps/dashboard`). The LLM deletion touches all layers including the DB schema. Each task produces independently commitable work; tasks in the "Bot UX" group depend on Task 2 (locale keys) completing first.

**Tech Stack:** Node.js / TypeScript, discord.js v14 (ComponentsV2 pattern via `createComponentsV2TextMessage`), Drizzle ORM (PostgreSQL), Next.js 14 App Router

---

## Task 0: Git cleanup — commit pending changes

**Files:**
- Modify: (varies — read actual diffs before staging)

- [ ] **Step 1: Inspect each diff group**

```bash
git diff HEAD apps/bot/src/discord/tts-announce.ts apps/bot/src/discord/tts-session.ts apps/bot/src/runtime.ts
```

Read the output. Determine what logical change these bot files represent (likely LLM wiring or TTS announce fix).

```bash
git diff HEAD apps/dashboard/src/app/health/health-dashboard.tsx apps/dashboard/src/app/logs/logs-explorer.tsx apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx apps/dashboard/src/app/tts/tts-dashboard.tsx apps/dashboard/src/app/voice/voice-dashboard.tsx
```

Read the output. Determine what the dashboard changes represent.

```bash
git diff HEAD docker-compose.yml packages/config/src/env.ts
```

Read the output. Determine what infra changes these represent.

- [ ] **Step 2: Commit bot changes**

Stage and commit the bot files based on what you found. Use a descriptive message matching the actual change.

```bash
git add apps/bot/src/discord/tts-announce.ts apps/bot/src/discord/tts-session.ts apps/bot/src/runtime.ts
git commit -m "$(cat <<'EOF'
<describe actual change based on diff>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Commit dashboard changes**

```bash
git add apps/dashboard/src/app/health/health-dashboard.tsx apps/dashboard/src/app/logs/logs-explorer.tsx apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx apps/dashboard/src/app/tts/tts-dashboard.tsx apps/dashboard/src/app/voice/voice-dashboard.tsx
git commit -m "$(cat <<'EOF'
<describe actual change based on diff>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Commit infra + docs**

```bash
git add docker-compose.yml packages/config/src/env.ts
git commit -m "$(cat <<'EOF'
<describe actual change based on diff>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git add "docs/superpowers/plans/2026-06-12-tts-ollama-llm-normalizer.md"
git commit -m "$(cat <<'EOF'
docs: add tts ollama llm normalizer plan

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Verify clean state**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

## Task 1: LLM complete deletion

**Files:**
- Delete: `apps/bot/src/discord/tts-llm-normalizer.ts`
- Delete: `apps/bot/src/discord/tts-llm-normalizer.test.ts`
- Delete: `apps/bot/src/commands/tts-llm.ts`
- Modify: `apps/bot/src/discord/tts-message-reader.ts`
- Modify: `apps/bot/src/runtime.ts`
- Modify: `packages/config/src/env.ts`
- Modify: `packages/db/src/repositories/tts-llm-settings.ts` → delete
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/src/schema/core.ts`
- Create: `packages/db/drizzle/0012_drop_tts_llm_enabled.sql`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Delete LLM files**

```bash
rm apps/bot/src/discord/tts-llm-normalizer.ts
rm apps/bot/src/discord/tts-llm-normalizer.test.ts
rm apps/bot/src/commands/tts-llm.ts
rm packages/db/src/repositories/tts-llm-settings.ts
```

- [ ] **Step 2: Remove normalizeWithLlm from tts-message-reader.ts**

In `apps/bot/src/discord/tts-message-reader.ts`, remove the `normalizeWithLlm` option and the two lines that use it:

Remove from `InstallTtsMessageReaderOptions`:
```typescript
normalizeWithLlm?: (text: string, guildId: string) => Promise<string>;
```

Remove these two lines (around line 362–366):
```typescript
const llmText = options.normalizeWithLlm
  ? await options.normalizeWithLlm(sanitizedText, message.guildId)
  : sanitizedText;

const readableText = llmText || sanitizedText;
```

Replace them with:
```typescript
const readableText = sanitizedText;
```

- [ ] **Step 3: Remove LLM wiring from runtime.ts**

In `apps/bot/src/runtime.ts`, remove the `createOllamaTextNormalizer` import and the ollamaNormalizer block:

Remove from imports:
```typescript
import { createOllamaTextNormalizer } from "./discord/tts-llm-normalizer.js";
```

Remove from imports:
```typescript
import { createDbConnection, recordSystemBotStarted, getGuildTtsLlmEnabled } from "@discord-bot/db";
```
Replace with:
```typescript
import { createDbConnection, recordSystemBotStarted } from "@discord-bot/db";
```

Remove the ollama block and tts-llm command registration. Also remove the `tts-llm` command from `installInteractionRouter` if it was added there (check `apps/bot/src/discord/interactions.ts`).

Remove from `installHandlers`:
```typescript
const ollamaNormalizer = env.OLLAMA_URL
  ? createOllamaTextNormalizer({
      ollamaUrl: env.OLLAMA_URL,
      model: env.OLLAMA_MODEL,
      isEnabled: (guildId) => getGuildTtsLlmEnabled(db.db, { guildId })
    })
  : undefined;
```

And change `installTtsMessageReader` call from:
```typescript
installTtsMessageReader(discordClient, {
  db: db.db,
  logWriter,
  speakerId: env.VOICEVOX_SPEAKER_ID,
  ttsQueue: ttsPlaybackQueue,
  ttsSessionManager,
  voicevox,
  ...(ollamaNormalizer
    ? { normalizeWithLlm: (text: string, guildId: string) => ollamaNormalizer.normalize(text, guildId) }
    : {})
});
```
to:
```typescript
installTtsMessageReader(discordClient, {
  db: db.db,
  logWriter,
  speakerId: env.VOICEVOX_SPEAKER_ID,
  ttsQueue: ttsPlaybackQueue,
  ttsSessionManager,
  voicevox
});
```

- [ ] **Step 4: Check interactions.ts for tts-llm command registration**

```bash
grep -n "tts-llm\|ttsLlm" apps/bot/src/discord/interactions.ts
```

If found, remove the import and the handler registration for `ttsLlmCommand`.

- [ ] **Step 5: Remove OLLAMA from env.ts**

In `packages/config/src/env.ts`, remove from `appEnvSchema`:
```typescript
OLLAMA_URL: z.string().url().optional(),
OLLAMA_MODEL: z.string().min(1).default("hf.co/bartowski/gemma-2-2b-jpn-it-GGUF:latest"),
```

- [ ] **Step 6: Remove tts_llm_enabled from DB schema**

In `packages/db/src/schema/core.ts`, find the `guildConfigs` table definition and remove:
```typescript
ttsLlmEnabled: boolean("tts_llm_enabled").notNull().default(false),
```

- [ ] **Step 7: Remove tts-llm-settings export from db/index.ts**

In `packages/db/src/index.ts`, remove:
```typescript
export * from "./repositories/tts-llm-settings.js";
```

- [ ] **Step 8: Generate DB migration**

```bash
pnpm -F @discord-bot/db drizzle-kit generate
```

Expected: creates `packages/db/drizzle/0012_*.sql` with `ALTER TABLE "guild_configs" DROP COLUMN "tts_llm_enabled";`

Verify the generated file contains the DROP COLUMN statement.

- [ ] **Step 9: Remove Ollama from docker-compose.yml**

In `docker-compose.yml`, remove the `ollama` service block (lines 43–51) and remove from the `bot` service:
- `OLLAMA_URL: ${OLLAMA_URL:-http://ollama:11434}` and `OLLAMA_MODEL: ...` from `environment`
- `ollama: condition: service_started` from `depends_on`

Also remove from the `volumes` section at the bottom:
```yaml
  ollama_data:
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
pnpm -F @discord-bot/bot tsc --noEmit
pnpm -F @discord-bot/db tsc --noEmit
pnpm -F @discord-bot/config tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Run tests**

```bash
pnpm -F @discord-bot/bot test
```

Expected: all tests pass. Any test files that import from `tts-llm-normalizer` will error — delete those failing test imports if found.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: remove Ollama LLM normalizer and tts-llm command entirely

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add locale keys

**Files:**
- Modify: `packages/shared/src/locale.ts`

All new locale keys for Tasks 3–8 are added here in one pass so later tasks have them available.

- [ ] **Step 1: Add new keys to the `Locale` type**

In `packages/shared/src/locale.ts`, extend the `Locale` type (after the last existing key, before the closing `}`):

```typescript
  ttsTipMutePrefix: string;
  ttsRateLimited: string;
  ttsRateLimitedHint: string;
  ttsForceJoinCurrentChannel: (vars: { id: string }) => string;
  recruitmentAutoCloseStatus: (vars: { enabled: boolean }) => string;
  recruitmentAutoClosedTitle: string;
  recruitmentAutoClosedHint: string;
  recruitmentReopenedTitle: string;
  setupStatusTitle: string;
  setupStatusTempVc: (vars: { id: string | null }) => string;
  setupStatusLogs: (vars: { id: string | null }) => string;
  setupStatusVoiceStatus: (vars: { id: string | null }) => string;
  setupStatusNotConfigured: string;
```

- [ ] **Step 2: Add English values**

In the `en` locale object (after `voiceSessionEndedAt`):

```typescript
    ttsTipMutePrefix: "Prefix messages with `//` to skip TTS.",
    ttsRateLimited: "⚡ Slow down",
    ttsRateLimitedHint: "Messages are rate-limited. Wait a moment before sending more.",
    ttsForceJoinCurrentChannel: ({ id }) => `Currently in <#${id}>`,
    recruitmentAutoCloseStatus: ({ enabled }) => `Auto-close at capacity: ${enabled ? "ON" : "OFF"}`,
    recruitmentAutoClosedTitle: "🔒 Recruitment closed",
    recruitmentAutoClosedHint: "Capacity reached — the recruitment has been automatically closed.",
    recruitmentReopenedTitle: "🟢 Recruitment reopened",
    setupStatusTitle: "📋 Server Configuration",
    setupStatusTempVc: ({ id }) => `Temp VC: ${id ? `<#${id}>` : "Not configured"}`,
    setupStatusLogs: ({ id }) => `Logs: ${id ? `<#${id}>` : "Not configured"}`,
    setupStatusVoiceStatus: ({ id }) => `Voice Status: ${id ? `<#${id}>` : "Not configured"}`,
    setupStatusNotConfigured: "Not configured",
```

- [ ] **Step 3: Add Japanese values**

In the `ja` locale object (after `voiceStatusMarker`):

```typescript
    ttsTipMutePrefix: "`//` で始まるメッセージは読み上げをスキップします。",
    ttsRateLimited: "⚡ 送信が速すぎます",
    ttsRateLimitedHint: "メッセージの読み上げにはレート制限があります。少し待ってから再送信してください。",
    ttsForceJoinCurrentChannel: ({ id }) => `現在 <#${id}> に接続中`,
    recruitmentAutoCloseStatus: ({ enabled }) => `定員到達で自動クローズ: ${enabled ? "ON" : "OFF"}`,
    recruitmentAutoClosedTitle: "🔒 募集がクローズしました",
    recruitmentAutoClosedHint: "定員に達したため、募集が自動的にクローズされました。",
    recruitmentReopenedTitle: "🟢 募集が再オープンしました",
    setupStatusTitle: "📋 サーバー設定",
    setupStatusTempVc: ({ id }) => `一時VC: ${id ? `<#${id}>` : "未設定"}`,
    setupStatusLogs: ({ id }) => `ログ: ${id ? `<#${id}>` : "未設定"}`,
    setupStatusVoiceStatus: ({ id }) => `通話状態: ${id ? `<#${id}>` : "未設定"}`,
    setupStatusNotConfigured: "未設定",
```

- [ ] **Step 4: Verify TypeScript**

```bash
pnpm -F @discord-bot/shared tsc --noEmit
```

Expected: no errors. TypeScript will catch any missing keys in the two locale objects.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/locale.ts
git commit -m "$(cat <<'EOF'
feat(shared): add locale keys for UX improvements

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: /join tip + /force-join current channel

**Files:**
- Modify: `apps/bot/src/commands/tts.ts`
- Test: `apps/bot/src/commands/tts.test.ts`

- [ ] **Step 1: Write failing test for /join tip**

Add to `apps/bot/src/commands/tts.test.ts`:

```typescript
describe("handleJoinCommand", () => {
  it("includes the mute-prefix tip in the success reply", async () => {
    let replyPayload: unknown = null;

    await handleJoinCommand(
      {
        guildId: "guild-1",
        channelId: "text-1",
        user: { id: "user-1" },
        guild: {
          voiceAdapterCreator: {},
          members: { fetch: async () => ({ voice: { channel: { id: "voice-1" } } }) }
        },
        reply: async (msg: unknown) => { replyPayload = msg; }
      } as never,
      {
        db: { select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) }) } as never,
        ttsSessionManager: {
          join: async () => ({ status: "joined" as const }),
          isConnected: () => false,
          getVoiceChannelId: () => null,
          getReadableChannelIds: () => []
        }
      }
    );

    assert.match(JSON.stringify(replyPayload), /\/\//);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm -F @discord-bot/bot test --test-name-pattern "includes the mute-prefix tip"
```

Expected: FAIL (tip not yet in the reply).

- [ ] **Step 3: Write failing test for /force-join current channel**

Add to `apps/bot/src/commands/tts.test.ts`:

```typescript
describe("handleForceJoinCommand — confirmation shows current channel", () => {
  it("includes the current voice channel id in the confirmation message", async () => {
    let replyPayload: unknown = null;

    await handleForceJoinCommand(
      {
        guildId: "guild-1",
        channelId: "text-1",
        user: { id: "user-1" },
        guild: {
          ownerId: "user-1",
          voiceAdapterCreator: {},
          members: { fetch: async () => ({ voice: { channel: { id: "voice-new" } }, roles: { cache: { map: () => [] } } }) }
        },
        reply: async (msg: unknown) => { replyPayload = msg; }
      } as never,
      {
        db: { select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) }) } as never,
        ttsSessionManager: {
          join: async () => ({ status: "joined" as const }),
          isConnected: () => true,
          getVoiceChannelId: () => "voice-current",
          getReadableChannelIds: () => [],
          forceJoin: async () => ({ status: "joined" as const })
        }
      }
    );

    assert.match(JSON.stringify(replyPayload), /voice-current/);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

```bash
pnpm -F @discord-bot/bot test --test-name-pattern "includes the current voice channel id"
```

Expected: FAIL.

- [ ] **Step 5: Implement — /join tip**

In `apps/bot/src/commands/tts.ts`, in `handleJoinCommand`, change the green reply from:

```typescript
await replyPrivate(interaction, loc.ttsConnected, [
  `${loc.ttsVoiceChannel({ id: target.voiceChannelId })}  ·  ${loc.ttsReadingChannel({ id: target.textChannelId })}`
], EVENT_COLORS.green);
```

to:

```typescript
await replyPrivate(interaction, loc.ttsConnected, [
  `${loc.ttsVoiceChannel({ id: target.voiceChannelId })}  ·  ${loc.ttsReadingChannel({ id: target.textChannelId })}`,
  loc.ttsTipMutePrefix
], EVENT_COLORS.green);
```

- [ ] **Step 6: Implement — force-join current channel**

In `apps/bot/src/commands/tts.ts`, change `createForceJoinConfirmation` signature and body:

```typescript
function createForceJoinConfirmation(
  input: ForceJoinCustomIdInput & { currentVoiceChannelId: string },
  loc: Loc
): InteractionReplyOptions {
  const confirm = new ButtonBuilder()
    .setCustomId(toForceJoinCustomId(input))
    .setLabel(loc.ttsButtonMove)
    .setStyle(ButtonStyle.Danger);
  const cancel = new ButtonBuilder()
    .setCustomId(toForceJoinCancelCustomId(input))
    .setLabel(loc.ttsButtonCancel)
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirm, cancel);

  const message = createComponentsV2TextMessage({
    title: loc.ttsForceJoinConfirmTitle,
    lines: [
      loc.ttsForceJoinCurrentChannel({ id: input.currentVoiceChannelId }),
      loc.ttsForceJoinAlreadyConnected,
      loc.ttsForceJoinMoveTo({ id: input.voiceChannelId })
    ],
    accentColor: EVENT_COLORS.yellow,
    privateResponse: true
  });

  return {
    ...message,
    components: [...(message.components ?? []), row]
  };
}
```

In `handleForceJoinCommand`, change the call site:

```typescript
if (currentVoiceChannelId && currentVoiceChannelId !== target.voiceChannelId) {
  await interaction.reply(
    createForceJoinConfirmation(
      { ...target, userId: interaction.user.id, currentVoiceChannelId },
      loc
    )
  );
  return;
}
```

- [ ] **Step 7: Run tests**

```bash
pnpm -F @discord-bot/bot test
```

Expected: all tests pass including both new tests.

- [ ] **Step 8: Commit**

```bash
git add apps/bot/src/commands/tts.ts apps/bot/src/commands/tts.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): add // tip to /join reply and show current channel in force-join confirm

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rate limit notification in TTS

**Files:**
- Modify: `apps/bot/src/discord/tts-message-reader.ts`
- Test: `apps/bot/src/discord/tts-message-reader.test.ts`

- [ ] **Step 1: Write failing test**

Open `apps/bot/src/discord/tts-message-reader.test.ts` and locate the existing tests, then add:

```typescript
describe("rate limit notification", () => {
  it("replies to the user when their message is rate-limited and cooldown has expired", async () => {
    const replies: unknown[] = [];

    const rateLimiter: TtsRateLimiter = { allow: () => false };

    await handleTtsMessage(
      fakeTtsMessage({ replies }),
      {
        db: fakeDb(),
        logWriter: fakeLogWriter(),
        rateLimiter,
        speakerId: 1,
        ttsSessionManager: fakeConnectedSessionManager("guild-1", ["text-1"], "voice-1"),
        voicevox: fakeVoicevox()
      }
    );

    assert.equal(replies.length, 1);
    assert.match(JSON.stringify(replies[0]), /Slow down|送信が速すぎます/);
  });

  it("does not notify again within the cooldown window", async () => {
    const replies: unknown[] = [];
    const rateLimiter: TtsRateLimiter = { allow: () => false };
    const now = Date.now();

    // First call — should notify
    await handleTtsMessage(fakeTtsMessage({ replies, userId: "u1" }), {
      db: fakeDb(),
      logWriter: fakeLogWriter(),
      rateLimiter,
      speakerId: 1,
      ttsSessionManager: fakeConnectedSessionManager("guild-1", ["text-1"], "voice-1"),
      voicevox: fakeVoicevox(),
      _nowForTesting: now
    });

    // Second call within cooldown — should NOT notify
    await handleTtsMessage(fakeTtsMessage({ replies, userId: "u1" }), {
      db: fakeDb(),
      logWriter: fakeLogWriter(),
      rateLimiter,
      speakerId: 1,
      ttsSessionManager: fakeConnectedSessionManager("guild-1", ["text-1"], "voice-1"),
      voicevox: fakeVoicevox(),
      _nowForTesting: now + 1000
    });

    assert.equal(replies.length, 1);
  });
});
```

> Note: `handleTtsMessage` and `fakeTtsMessage` / helpers are likely already defined in the test file. Check the existing test file for what helpers exist. If `handleTtsMessage` is not directly exported, look at what the existing tests use and follow the same pattern. The `_nowForTesting` escape hatch needs to be added to the options in the implementation step.

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm -F @discord-bot/bot test --test-name-pattern "rate limit notification"
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `apps/bot/src/discord/tts-message-reader.ts`:

Add a constant at the top of the file (after imports):
```typescript
const RATE_LIMIT_NOTIFY_COOLDOWN_MS = 5_000;
```

Add a module-level cooldown map before `installTtsMessageReader`:
```typescript
const rateLimitNotifyCooldowns = new Map<string, number>();
```

Add `_nowForTesting?: number` to `InstallTtsMessageReaderOptions` (for testability):
```typescript
_nowForTesting?: number;
```

In the rate-limit block (around line 316–334), after the log write and before `return`, add:

```typescript
    const now = options._nowForTesting ?? Date.now();
    const cooldownKey = `${message.guildId}:${message.author.id}`;
    const lastNotified = rateLimitNotifyCooldowns.get(cooldownKey) ?? 0;

    if (now - lastNotified >= RATE_LIMIT_NOTIFY_COOLDOWN_MS) {
      rateLimitNotifyCooldowns.set(cooldownKey, now);
      const config = await getGuildConfigByGuildId(options.db, message.guildId).catch(() => null);
      const lang = config?.language && isGuildLanguage(config.language) ? config.language : "en";
      const loc = getLocale(lang);

      await message.reply({
        ...createComponentsV2TextMessage({
          title: loc.ttsRateLimited,
          lines: [loc.ttsRateLimitedHint],
          accentColor: EVENT_COLORS.yellow
        })
      }).catch((err: unknown) => {
        console.warn("failed to send rate limit notification", err);
      });
    }
```

Add the missing imports to the top of the file:
```typescript
import { getLocale, isGuildLanguage } from "@discord-bot/shared";
import { createComponentsV2TextMessage, EVENT_COLORS } from "./components-v2.js";
```

- [ ] **Step 4: Run tests**

```bash
pnpm -F @discord-bot/bot test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/bot/src/discord/tts-message-reader.ts apps/bot/src/discord/tts-message-reader.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): notify user when TTS message is rate-limited

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Temp VC control panel — state toggle

**Files:**
- Modify: `apps/bot/src/discord/temp-voice-controls.ts`
- Test: `apps/bot/src/discord/temp-voice-controls.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `apps/bot/src/discord/temp-voice-controls.test.ts`:

```typescript
describe("createTempVoiceControlMessage — state toggle", () => {
  it("shows only 🔓 解除 when isLocked is true", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: true,
      isHidden: false
    });
    const s = JSON.stringify(msg);

    assert.doesNotMatch(s, /temp-vc:lock:v1/);
    assert.match(s, /temp-vc:unlock:v1/);
  });

  it("shows only 🔒 ロック when isLocked is false", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: false,
      isHidden: false
    });
    const s = JSON.stringify(msg);

    assert.match(s, /temp-vc:lock:v1/);
    assert.doesNotMatch(s, /temp-vc:unlock:v1/);
  });

  it("shows only 👁️ 表示 when isHidden is true", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: false,
      isHidden: true
    });
    const s = JSON.stringify(msg);

    assert.doesNotMatch(s, /temp-vc:hide:v1/);
    assert.match(s, /temp-vc:show:v1/);
  });

  it("shows status line in header", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: true,
      isHidden: false
    });
    const s = JSON.stringify(msg);

    assert.match(s, /🔒/);
    assert.match(s, /👁️/);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm -F @discord-bot/bot test --test-name-pattern "createTempVoiceControlMessage — state toggle"
```

Expected: FAIL (existing function doesn't accept `isLocked`/`isHidden`).

- [ ] **Step 3: Update createTempVoiceControlMessage**

In `apps/bot/src/discord/temp-voice-controls.ts`, update the function signature and body:

Change the input interface (the inline object type at line 99) to:
```typescript
export function createTempVoiceControlMessage(input: {
  ownerId: string;
  tempVoiceChannelId: string;
  allowedUserIds?: string[];
  deniedUserIds?: string[];
  isLocked?: boolean;
  isHidden?: boolean;
}): MessageCreateOptions & MessageEditOptions {
```

Update the info lines section — after `const { allowedUserIds = [], deniedUserIds = [] } = input;`, add:
```typescript
  const isLocked = input.isLocked ?? false;
  const isHidden = input.isHidden ?? false;

  const statusLine = [
    isLocked ? "🔒 ロック中" : "🔓 オープン",
    isHidden ? "🙈 非表示" : "👁️ 表示中"
  ].join("  ·  ");
```

Update `infoLines`:
```typescript
  const infoLines = [
    `オーナー: <@${input.ownerId}>`,
    `VC: <#${input.tempVoiceChannelId}>`,
    statusLine
  ];
```

Update `firstRow` to toggle lock/unlock and hide/show:
```typescript
  const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createButton(channelId, "rename", "✏️ 名前変更", ButtonStyle.Primary),
    ...(isLocked
      ? [createButton(channelId, "unlock", "🔓 解除", ButtonStyle.Secondary)]
      : [createButton(channelId, "lock", "🔒 ロック", ButtonStyle.Secondary)]),
    ...(isHidden
      ? [createButton(channelId, "show", "👁️ 表示", ButtonStyle.Secondary)]
      : [createButton(channelId, "hide", "🙈 非表示", ButtonStyle.Secondary)])
  );
```

- [ ] **Step 4: Update callers to pass state**

Find all calls to `createTempVoiceControlMessage` in the codebase:

```bash
grep -rn "createTempVoiceControlMessage" apps/bot/src/
```

For each call site (likely in `temp-voice.ts` or `temp-voice-controls.ts`), determine the VC's locked/hidden state from its permission overwrites and pass `isLocked` and `isHidden`.

Pattern to determine state (add a helper to `temp-voice-controls.ts`):

```typescript
export function getTempVoiceState(channel: GuildBasedChannel) {
  if (!("permissionOverwrites" in channel)) {
    return { isLocked: false, isHidden: false };
  }
  const overwrites = (channel as { permissionOverwrites: { cache: Map<string, { type: number; id: string; deny: { has: (flag: bigint) => boolean } }> } }).permissionOverwrites.cache;
  const everyoneOverwrite = [...overwrites.values()].find(
    (o) => o.type === 0 // OverwriteType.Role
  );
  return {
    isLocked: everyoneOverwrite?.deny.has(PermissionFlagsBits.Connect) ?? false,
    isHidden: everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel) ?? false
  };
}
```

At each call site, pass the state:
```typescript
const { isLocked, isHidden } = getTempVoiceState(voiceChannel);
createTempVoiceControlMessage({ ..., isLocked, isHidden });
```

- [ ] **Step 5: Run tests**

```bash
pnpm -F @discord-bot/bot test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/bot/src/discord/temp-voice-controls.ts apps/bot/src/discord/temp-voice-controls.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): toggle lock/hide state in Temp VC control panel

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Recruitment — auto-close display + creator notification

**Files:**
- Modify: `apps/bot/src/commands/recruitment.ts`
- Modify: `apps/bot/src/discord/recruitment-interactions.ts`
- Test: `apps/bot/src/commands/recruitment.test.ts`

- [ ] **Step 1: Write failing test for auto-close status in create reply**

Open `apps/bot/src/commands/recruitment.test.ts` and add:

```typescript
describe("recruitment create — auto-close status in reply", () => {
  it("shows auto-close ON when autoClose is true (default)", async () => {
    let replyPayload: unknown = null;
    // Use the existing test helpers in this file to call handleRecruitmentCommand
    // with action "create" and check the reply includes "ON"
    // (Follow the existing test pattern in this file)
    await handleRecruitmentCommand(
      fakeCreateInteraction({ autoClose: true, replyCapture: (msg) => { replyPayload = msg; } }),
      fakeRecruitmentContext()
    );
    assert.match(JSON.stringify(replyPayload), /ON|オン/);
  });
});
```

> Adapt `fakeCreateInteraction` and `fakeRecruitmentContext` to what already exists in this test file. Run the existing tests first to understand the helper names.

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm -F @discord-bot/bot test --test-name-pattern "auto-close status in reply"
```

Expected: FAIL.

- [ ] **Step 3: Add auto-close status to create reply in recruitment.ts**

In `apps/bot/src/commands/recruitment.ts`, find the `recruitmentCreated` reply. It will look similar to:

```typescript
await interaction.reply({
  ...createComponentsV2TextMessage({
    title: loc.recruitmentCreated,
    lines: [loc.recruitmentPostLink({ url: postUrl })],
    accentColor: EVENT_COLORS.teal,
    privateResponse: true
  })
});
```

Change to:
```typescript
await interaction.reply({
  ...createComponentsV2TextMessage({
    title: loc.recruitmentCreated,
    lines: [
      loc.recruitmentPostLink({ url: postUrl }),
      loc.recruitmentAutoCloseStatus({ enabled: autoClose })
    ],
    accentColor: EVENT_COLORS.teal,
    privateResponse: true
  })
});
```

Where `autoClose` is the boolean value already obtained from `interaction.options.getBoolean("auto-close") ?? true`.

- [ ] **Step 4: Add creator notification in recruitment-interactions.ts**

In `apps/bot/src/discord/recruitment-interactions.ts`, in `handleJoin`, after the `interaction.message.edit(...)` call and before `interaction.reply(...)`, add creator notification when auto-closed:

```typescript
  if (nextStatus === "closed" && recruitment.autoClose) {
    const loc2 = await resolveLocale(context.db, interaction.guildId);
    await interaction.channel?.send({
      ...createComponentsV2TextMessage({
        title: loc2.recruitmentAutoClosedTitle,
        lines: [
          `<@${recruitment.creatorId}>`,
          loc2.recruitmentAutoClosedHint
        ],
        accentColor: EVENT_COLORS.gray
      })
    }).catch((err: unknown) => {
      console.warn("failed to send recruitment auto-close notification", err);
    });
  }
```

In `handleLeave`, after `interaction.message.edit(...)` and before `interaction.reply(...)`, add reopen notification:

```typescript
  if (shouldReopen) {
    const loc2 = await resolveLocale(context.db, interaction.guildId);
    await interaction.channel?.send({
      ...createComponentsV2TextMessage({
        title: loc2.recruitmentReopenedTitle,
        lines: [`<@${recruitment.creatorId}>`],
        accentColor: EVENT_COLORS.green
      })
    }).catch((err: unknown) => {
      console.warn("failed to send recruitment reopen notification", err);
    });
  }
```

- [ ] **Step 5: Run tests**

```bash
pnpm -F @discord-bot/bot test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/bot/src/commands/recruitment.ts apps/bot/src/discord/recruitment-interactions.ts apps/bot/src/commands/recruitment.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): show auto-close status in recruitment create reply and notify creator on close/reopen

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: /setup status subcommand

**Files:**
- Modify: `apps/bot/src/commands/setup.ts`
- Test: `apps/bot/src/commands/setup.test.ts`

- [ ] **Step 1: Write failing test**

Add to `apps/bot/src/commands/setup.test.ts`:

```typescript
describe("handleSetupCommand — status", () => {
  it("replies with current guild config as gray embed", async () => {
    let replyPayload: unknown = null;

    await handleSetupCommand(
      {
        guildId: "guild-1",
        memberPermissions: { has: () => true },
        options: { getSubcommand: () => "status", getChannel: () => null },
        guild: null,
        reply: async (msg: unknown) => { replyPayload = msg; }
      } as never,
      {
        db: {
          select: () => ({
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: async () => [{
                    tempVoiceCreateChannelId: "vc-123",
                    logChannelId: null,
                    voiceStatusChannelId: "vs-456"
                  }]
                })
              })
            })
          })
        } as never
      }
    );

    const s = JSON.stringify(replyPayload);
    assert.match(s, /vc-123/);
    assert.match(s, /vs-456/);
    assert.match(s, /Not configured|未設定/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm -F @discord-bot/bot test --test-name-pattern "handleSetupCommand — status"
```

Expected: FAIL.

- [ ] **Step 3: Add status subcommand to setupCommand builder**

In `apps/bot/src/commands/setup.ts`, add to `setupCommand` after the last `.addSubcommand(...)`:

```typescript
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Show current bot configuration for this guild.")
      .setDescriptionLocalization("ja", "このサーバーの現在のBot設定を表示します。")
  )
```

- [ ] **Step 4: Add status case to handleSetupCommand**

In `apps/bot/src/commands/setup.ts`, add to the `switch (subcommand)` block:

```typescript
    case "status":
      await handleStatusSetup(interaction, context, guildId, loc);
      return;
```

Then add the handler function at the bottom of the file:

```typescript
async function handleStatusSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const config = await getGuildConfigByGuildId(context.db, guildId).catch(() => null);

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.setupStatusTitle,
      lines: [
        loc.setupStatusTempVc({ id: config?.tempVoiceCreateChannelId ?? null }),
        loc.setupStatusLogs({ id: config?.logChannelId ?? null }),
        loc.setupStatusVoiceStatus({ id: config?.voiceStatusChannelId ?? null })
      ],
      accentColor: EVENT_COLORS.gray,
      privateResponse: true
    })
  });
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm -F @discord-bot/bot test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/bot/src/commands/setup.ts apps/bot/src/commands/setup.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): add /setup status to show current guild configuration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Dashboard language unification

**Files:**
- Modify: `apps/dashboard/src/app/dashboard-ui.ts`
- Modify: `apps/dashboard/src/app/page.tsx`
- Modify: `apps/dashboard/src/app/logs/page.tsx`

No bot tests needed — changes are UI strings.

- [ ] **Step 1: Update dashboard-ui.ts nav groups to English**

In `apps/dashboard/src/app/dashboard-ui.ts`, replace the `dashboardNavGroups` constant:

```typescript
const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Activity",
    items: [
      { href: "/", label: "Overview", description: "KPIs and recent activity" },
      { href: "/logs", label: "Logs", description: "Event history and real-time notifications" },
    ],
  },
  {
    label: "Features",
    items: [
      { href: "/voice", label: "Voice", description: "VC sessions and temporary VC management" },
      { href: "/recruitment", label: "Recruitment", description: "Recruitment posts and status management" },
      { href: "/tts", label: "TTS", description: "Text-to-speech configuration" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", description: "Server settings and access management" },
      { href: "/health", label: "Health", description: "Dependency service status" },
    ],
  },
];
```

- [ ] **Step 2: Update Overview page title/description**

In `apps/dashboard/src/app/page.tsx`, change:

```tsx
      title="概要"
    >
```
to:
```tsx
      title="Overview"
    >
```

And change:
```tsx
      description="サーバーのアクティビティと KPI"
```
to:
```tsx
      description="Server activity and KPIs"
```

- [ ] **Step 3: Update Logs page title/description**

In `apps/dashboard/src/app/logs/page.tsx`, change:

```tsx
      title="ログ"
```
to:
```tsx
      title="Logs"
```

And change:
```tsx
      description="イベント履歴とリアルタイム通知"
```
to:
```tsx
      description="Event history and real-time notifications"
```

- [ ] **Step 4: Run dashboard type check**

```bash
pnpm -F @discord-bot/dashboard tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Verify dashboard-ui.test.ts passes**

```bash
pnpm -F @discord-bot/dashboard test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/app/dashboard-ui.ts apps/dashboard/src/app/page.tsx apps/dashboard/src/app/logs/page.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): unify navigation language to English

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Verification Checklist

After all tasks complete, verify end-to-end:

- [ ] `/join` reply includes the `//` mute tip line
- [ ] Rate-limited TTS sends ephemeral yellow warning; second rapid message does not duplicate it
- [ ] `/force-join` confirmation embed shows the current voice channel before the move-to line
- [ ] Temp VC creation shows single lock button matching actual state; clicking updates the panel
- [ ] `/recruitment create` reply shows "Auto-close at capacity: ON"; auto-close fires and notifies creator channel
- [ ] `/setup status` returns gray embed with channel IDs (or "Not configured")
- [ ] Dashboard sidebar shows: Overview, Voice, Recruitment, TTS, Health, Logs, Settings (all English)
- [ ] `/tts-llm` command does not exist in Discord slash command list after re-registering commands
- [ ] `docker-compose up` starts without Ollama
- [ ] DB migration 0012 applied: `guild_configs` has no `tts_llm_enabled` column
