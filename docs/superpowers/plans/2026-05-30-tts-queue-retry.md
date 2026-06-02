# TTS Queue Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Process TTS read-aloud work through a guild-scoped queue and retry VOICEVOX synthesis with backoff.

**Architecture:** Add a small local `TtsPlaybackQueue` abstraction in the bot process. `handleTtsMessage` prepares text/speaker metadata, then enqueues a job that synthesizes, plays, and writes success/error logs in order per guild. Add retry behavior as a wrapper around `VoicevoxClient.synthesize`, keeping Redis queue replacement possible later without changing message filtering.

**Tech Stack:** TypeScript, Node test runner, existing Discord bot modules, pnpm, Docker Compose.

---

### Task 1: Queue Unit

**Files:**
- Create: `apps/bot/src/discord/tts-queue.ts`
- Create: `apps/bot/src/discord/tts-queue.test.ts`
- Modify: `apps/bot/package.json`

- [ ] Write tests proving jobs for the same guild run sequentially.
- [ ] Write tests proving jobs for different guilds can run independently.
- [ ] Implement `LocalTtsPlaybackQueue` with `enqueue({ guildId }, job)`.
- [ ] Add the new test file to the bot test script.

### Task 2: Retry Unit

**Files:**
- Modify: `apps/bot/src/discord/voicevox.ts`
- Modify: `apps/bot/src/discord/voicevox.test.ts`

- [ ] Write a failing test where synthesis fails once then succeeds.
- [ ] Implement retry options: `maxAttempts`, `baseDelayMs`, injectable `sleep`.
- [ ] Keep the existing default behavior compatible, with retries enabled by default.

### Task 3: Reader Integration

**Files:**
- Modify: `apps/bot/src/discord/tts-message-reader.ts`
- Modify: `apps/bot/src/discord/tts-message-reader.test.ts`
- Modify: `apps/bot/src/runtime.ts`

- [ ] Inject `ttsQueue?: TtsPlaybackQueue` into `InstallTtsMessageReaderOptions`.
- [ ] Use `LocalTtsPlaybackQueue` by default in `installTtsMessageReader`.
- [ ] Enqueue the synthesize/play/log-success/error block after filtering, dictionary, and speaker resolution.
- [ ] Update tests to assert two accepted messages are played in queue order.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/tts.md`

- [ ] Document local queue and retry/backoff behavior.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- [ ] Run `docker compose build bot dashboard`.
- [ ] Commit, push, create PR to `phase/10-tts-dictionary-safety-speaker`, wait for CI, squash merge, close #167.
