# TTS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase6 TTS foundation with `/join`, `/force-join`, `/leave`, `/setup tts`, VOICEVOX synthesis, and Discord voice playback.

**Architecture:** Store the persistent TTS source channel on `guild_configs`. Keep active voice connections and temporary `/join` channels in an in-memory `TtsSessionManager`. Reuse Dashboard access grants to authorize `/force-join`, and use `@discordjs/voice` for VC connection/playback.

**Tech Stack:** TypeScript, discord.js, @discordjs/voice, Drizzle PostgreSQL, VOICEVOX HTTP API, node:test.

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `packages/db/src/schema/core.ts` | Modify | Add `tts_text_channel_id` to `guild_configs`. |
| `packages/db/src/repositories/guilds.ts` | Modify | Read/update persistent TTS channel config. |
| `packages/db/drizzle/0005_tts_foundation.sql` | Create | Add the new DB column. |
| `packages/db/drizzle/meta/_journal.json` | Modify | Register migration `0005_tts_foundation`. |
| `apps/bot/package.json` | Modify | Add voice dependencies and include TTS tests. |
| `apps/bot/src/commands/setup.ts` | Modify | Add `/setup tts channel`. |
| `apps/bot/src/commands/tts.ts` | Create | Define `/join`, `/force-join`, `/leave` commands and handlers. |
| `apps/bot/src/commands/index.ts` | Modify | Export TTS commands and handlers. |
| `apps/bot/src/discord/interactions.ts` | Modify | Route new commands and force-join button interactions. |
| `apps/bot/src/discord/dashboard-access.ts` | Create | Resolve Dashboard `admin` or higher for bot commands. |
| `apps/bot/src/discord/voicevox.ts` | Create | VOICEVOX audio_query/synthesis client and text normalization. |
| `apps/bot/src/discord/tts-session.ts` | Create | In-memory guild TTS sessions, channel source logic, playback queue. |
| `apps/bot/src/discord/tts-message-reader.ts` | Create | MessageCreate handler for text-to-speech. |
| `apps/bot/src/runtime.ts` | Modify | Install TTS message reader and session manager. |
| `docs/tts.md` | Create | Local verification and Discord command usage. |
| `README.md` | Modify | Add Phase6 TTS status and docs link. |

---

## Task 1: DB TTS Channel Config

- [ ] Write a repository test or focused type-level expectation for `getGuildConfigByGuildId` returning `ttsTextChannelId`.
- [ ] Run `pnpm --filter @discord-bot/db test` and confirm failure before implementation.
- [ ] Add `ttsTextChannelId: text("tts_text_channel_id")` to `guildConfigs`.
- [ ] Add `ttsTextChannelId` to `getGuildConfigByGuildId`.
- [ ] Add `updateGuildTtsConfigByGuildId(db, { guildId, ttsTextChannelId })`.
- [ ] Create migration SQL:

```sql
ALTER TABLE "guild_configs" ADD COLUMN "tts_text_channel_id" text;
```

- [ ] Update Drizzle journal with idx `5`, tag `0005_tts_foundation`.
- [ ] Run `pnpm --filter @discord-bot/db typecheck`.
- [ ] Commit: `feat(db): add tts channel config`.

## Task 2: TTS Policy Helpers

- [ ] Create `apps/bot/src/discord/voicevox.test.ts`.
- [ ] Test `normalizeTtsText` skips empty, slash commands, and bot messages via input flags.
- [ ] Test long text is truncated to the configured limit.
- [ ] Run bot test and confirm failure because helper does not exist.
- [ ] Create `apps/bot/src/discord/voicevox.ts` with:
  - `normalizeTtsText(input, maxLength = 120)`
  - `createVoicevoxClient({ baseUrl, speaker })`
  - `synthesize(text): Promise<Buffer>`
- [ ] Add `voicevox.test.js` to bot `test` script.
- [ ] Run `pnpm --filter @discord-bot/bot test`.
- [ ] Commit: `feat(bot): add voicevox tts text policy`.

## Task 3: Dashboard Admin Authorization For Bot Commands

- [ ] Create `apps/bot/src/discord/dashboard-access.test.ts`.
- [ ] Test owner is allowed.
- [ ] Test user grant `admin` is allowed.
- [ ] Test role grant `admin` is allowed.
- [ ] Test `viewer` is rejected.
- [ ] Run bot test and confirm failure.
- [ ] Create `apps/bot/src/discord/dashboard-access.ts`.
- [ ] Implement `resolveBotDashboardAccessRole` using `listDashboardAccessGrants`, `maxDashboardAccessRole`, and guild owner/member roles.
- [ ] Implement `canUseDashboardAdminCommand`.
- [ ] Add the test file to bot `test` script.
- [ ] Run `pnpm --filter @discord-bot/bot test`.
- [ ] Commit: `feat(bot): authorize tts force join with dashboard admin`.

## Task 4: TTS Session Manager

- [ ] Create `apps/bot/src/discord/tts-session.test.ts`.
- [ ] Test `/join` source channels and persistent channels are de-duplicated.
- [ ] Test connected-to-other-VC policy returns blocked for `/join`.
- [ ] Test `/leave` clears temporary sources.
- [ ] Run bot test and confirm failure.
- [ ] Create `apps/bot/src/discord/tts-session.ts`.
- [ ] Implement `TtsSessionManager` with:
  - `join`
  - `forceJoin`
  - `leave`
  - `getReadableChannelIds`
  - `isConnected`
  - serial playback per guild
- [ ] Use `@discordjs/voice` for `joinVoiceChannel`, `getVoiceConnection`, `createAudioPlayer`, `createAudioResource`, and `NoSubscriberBehavior.Play`.
- [ ] Add voice dependencies to `apps/bot/package.json`.
- [ ] Add test file to bot `test` script.
- [ ] Run `pnpm --filter @discord-bot/bot test`.
- [ ] Commit: `feat(bot): add tts session manager`.

## Task 5: Commands And Interactions

- [ ] Create `apps/bot/src/commands/tts.test.ts`.
- [ ] Test command builders expose `/join`, `/force-join`, and `/leave`.
- [ ] Test `/force-join` conflict confirmation custom id parsing.
- [ ] Run bot test and confirm failure.
- [ ] Create `apps/bot/src/commands/tts.ts`.
- [ ] Add command builders for:
  - `/join`
  - `/force-join`
  - `/leave`
- [ ] Implement handlers using `TtsSessionManager`.
- [ ] Send Components V2 confirmation for force moving between VCs.
- [ ] Route command and button interactions from `interactions.ts`.
- [ ] Export commands from `commands/index.ts`.
- [ ] Run `pnpm --filter @discord-bot/bot test`.
- [ ] Commit: `feat(bot): add tts join leave commands`.

## Task 6: `/setup tts`

- [ ] Add setup command test coverage for subcommand names if feasible.
- [ ] Add `/setup tts channel:#channel` to `setupCommand`.
- [ ] Persist via `ensureGuildSetup` and `updateGuildTtsConfigByGuildId`.
- [ ] Use Components V2 response.
- [ ] Run `pnpm --filter @discord-bot/bot test`.
- [ ] Commit: `feat(bot): add setup tts channel`.

## Task 7: Message Reader Runtime

- [ ] Create `apps/bot/src/discord/tts-message-reader.test.ts`.
- [ ] Test bot messages are skipped.
- [ ] Test messages outside source channels are skipped.
- [ ] Test eligible messages call synthesize and enqueue playback.
- [ ] Run bot test and confirm failure.
- [ ] Create `apps/bot/src/discord/tts-message-reader.ts`.
- [ ] Install `Events.MessageCreate` handler.
- [ ] Load persistent TTS channel via `getGuildConfigByGuildId`.
- [ ] Use `normalizeTtsText`, VOICEVOX client, and session manager playback.
- [ ] Log `system.voicevox.error` through existing log writer when synthesis/playback fails.
- [ ] Wire into `runtime.ts`.
- [ ] Run `pnpm --filter @discord-bot/bot test`.
- [ ] Commit: `feat(bot): read configured messages with tts`.

## Task 8: Docs And Verification

- [ ] Create `docs/tts.md` with:
  - required bot permissions,
  - Docker startup,
  - `/setup tts`,
  - `/join`,
  - `/force-join`,
  - `/leave`,
  - expected manual checks.
- [ ] Update `README.md` Phase6 and docs link.
- [ ] Run:

```bash
pnpm --filter @discord-bot/db typecheck
pnpm --filter @discord-bot/bot test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- [ ] Run Docker verification:

```bash
docker compose --profile app up -d --build bot voicevox
docker compose --profile app logs -f bot
```

- [ ] Commit: `docs: add tts verification guide`.

---

## Self Review

- Spec coverage: `/join`, `/force-join`, `/leave`, `/setup tts`, Dashboard admin authorization, VOICEVOX, playback, and docs are mapped to tasks.
- Placeholders: none.
- Type consistency: `ttsTextChannelId` maps to DB column `tts_text_channel_id`; command naming uses slash command names `join`, `force-join`, and `leave`.
