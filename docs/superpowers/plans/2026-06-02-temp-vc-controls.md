# Temp VC Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add owner-only Temp VC control interactions for rename, lock/unlock, hide/show, user limit, bitrate, and kick.

**Architecture:** Keep Temp VC lifecycle in `temp-voice.ts` and add a focused `temp-voice-controls.ts` module for Components V2 controls, custom id parsing, owner authorization, and interaction handling. Wire the handler into the existing interaction router after TTS and before recruitment. Use direct Discord channel mutations only for the generated Temp VC tracked in `temp_voice_channels`.

**Tech Stack:** TypeScript, discord.js interactions, Components V2, node:test, Drizzle-backed Temp VC repository.

---

### Task 1: Control Message And Custom IDs

**Files:**
- Create: `apps/bot/src/discord/temp-voice-controls.ts`
- Test: `apps/bot/src/discord/temp-voice-controls.test.ts`
- Modify: `apps/bot/package.json`
- Modify: `apps/bot/src/discord/temp-voice.ts`

- [ ] Write tests for parsing control custom ids and creating a Components V2 control message with owner/channel text plus rename, lock, hide, user limit, bitrate, and kick controls.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm the new tests fail because the module does not exist.
- [ ] Implement `createTempVoiceControlMessage`, `toTempVoiceControlCustomId`, and `parseTempVoiceControlCustomId`.
- [ ] Update `sendControlChannelMessage` in `temp-voice.ts` to use the new control message.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm the tests pass.

### Task 2: Owner Authorization And Simple Buttons

**Files:**
- Modify: `apps/bot/src/discord/temp-voice-controls.ts`
- Test: `apps/bot/src/discord/temp-voice-controls.test.ts`
- Modify: `apps/bot/src/discord/interactions.ts`

- [ ] Write tests that owner-only authorization rejects non-owners and allows owners.
- [ ] Write tests for lock/unlock/hide/show applying permission overwrites to the generated voice channel.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm failures for missing behavior.
- [ ] Implement `handleTempVoiceControlInteraction` for button actions `lock`, `unlock`, `hide`, and `show`.
- [ ] Wire the handler into `installInteractionRouter`.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm tests pass.

### Task 3: Modal-Based Numeric And Rename Controls

**Files:**
- Modify: `apps/bot/src/discord/temp-voice-controls.ts`
- Test: `apps/bot/src/discord/temp-voice-controls.test.ts`
- Modify: `apps/bot/src/discord/interactions.ts`

- [ ] Write tests for rename, user-limit, and bitrate button actions showing modals.
- [ ] Write tests for modal submit validation and voice channel updates.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm failures.
- [ ] Implement modal custom ids, modal builders, and modal submit handling.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm tests pass.

### Task 4: Kick Control

**Files:**
- Modify: `apps/bot/src/discord/temp-voice-controls.ts`
- Test: `apps/bot/src/discord/temp-voice-controls.test.ts`
- Modify: `apps/bot/src/discord/interactions.ts`

- [ ] Write tests for kick target selection and owner-only enforcement.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm failures.
- [ ] Implement user select kick handling by disconnecting selected members only if they are currently in the Temp VC.
- [ ] Run `pnpm --filter @discord-bot/bot test` and confirm tests pass.

### Task 5: Verification And PR

**Files:**
- Modify: `docs/temp-vc.md`

- [ ] Document control behavior, owner-only access, manual verification, and required bot permissions.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Run `docker compose build bot dashboard`.
- [ ] Commit, push, create PR to `phase/11-temp-vc-controls`, wait for CI, squash merge, and close #169.
