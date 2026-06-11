# TTS UX Improvements Design

**Date:** 2026-06-11
**Status:** Approved

## Context

The TTS feature is functionally complete but has friction in three areas:

1. **Speaker selection** — users must know the VOICEVOX speaker ID (an integer) with no way to browse or preview voices from Discord or the dashboard.
2. **Dictionary registration** — the web dashboard displays existing entries but provides no form for adding new ones; users must rely on slash commands whose syntax is hard to remember.
3. **VC announcements** — there is no audio feedback when users join or leave the TTS voice channel, making it unclear who is present.

## Scope

Three self-contained improvements delivered together:

1. Speaker autocomplete + dashboard preview
2. Dictionary add form on the dashboard
3. VC join/leave announcement handler

---

## 1. Speaker Selection UX

### 1a. `/speaker set` Autocomplete

**What:** Fetch the speaker list from VOICEVOX `GET /speakers` and wire it to the Discord autocomplete handler for `/speaker set` and `/speaker server-default`.

**Display format:** `四国めたん（ノーマル） [ID: 2]`

**Behavior:**
- Input text filters by speaker name (case-insensitive partial match)
- Up to 25 results returned (Discord limit)
- If VOICEVOX is unreachable, return an empty autocomplete list (graceful fallback)

**Files to modify:**
- `apps/bot/src/commands/tts.ts` — add `autocomplete` handler for the `speaker_id` option
- `apps/bot/src/discord/voicevox.ts` — add `getSpeakers(): Promise<VoicevoxSpeaker[]>` method that calls `GET /speakers`

**Types to add (in voicevox.ts or shared):**
```typescript
interface VoicevoxSpeakerStyle {
  id: number
  name: string
  type: string
}
interface VoicevoxSpeaker {
  name: string
  speaker_uuid: string
  styles: VoicevoxSpeakerStyle[]
}
```

### 1b. Dashboard Speaker Preview

**What:** Add a "試聴" (preview) button next to each speaker entry on the TTS dashboard. Clicking it fetches synthesized audio from a new API route and plays it in the browser.

**New API route:** `GET /api/tts/preview?speakerId=<id>`
- Calls VOICEVOX with sample text `「テストです。よろしくお願いします。」`
- Returns the WAV buffer with `Content-Type: audio/wav`
- Returns 400 if `speakerId` is missing/invalid, 502 if VOICEVOX fails

**Files to create:**
- `apps/dashboard/src/app/api/tts/preview/route.ts`

**Files to modify:**
- `apps/dashboard/src/app/tts/tts-dashboard.tsx` — add preview button per speaker row; on click, fetch the route and play via `new Audio(url).play()`

---

## 2. Dictionary Add Form (Dashboard)

**What:** Add a "新しい単語を登録" form section to the TTS dashboard above (or below) the existing dictionary entry list.

**Fields:**

| Field | Type | Notes |
|---|---|---|
| 変換前 (from_text) | text input | required |
| 変換後 (to_text) | text input | required |
| スコープ | select: `guild` / `user` | default `guild`; only admins see `guild` option |
| 優先度 | number input | default 0, min 0 |

**Submission:** `PATCH /api/tts-settings` with `action: "upsert-dictionary"` — this endpoint already exists and handles creates/updates.

**After submit:** Refresh the dictionary list in the UI (invalidate/refetch).

**Files to modify:**
- `apps/dashboard/src/app/tts/tts-dashboard.tsx` — add form component
- `apps/dashboard/src/app/api/tts-settings/route.ts` — verify `upsert-dictionary` action already supports new entries (no `id` field = insert); confirm or add that branch

---

## 3. VC Join/Leave Announcements

**What:** When a user joins or leaves the active TTS voice channel, the bot reads out a short announcement using the guild's default speaker.

### Trigger logic (VoiceStateUpdate)

| Event | Condition | Announcement |
|---|---|---|
| User enters TTS VC | `newState.channelId === ttsVoiceChannelId` | `「{displayName}が参加しました」` |
| User leaves TTS VC | `oldState.channelId === ttsVoiceChannelId && newState.channelId !== ttsVoiceChannelId` | `「{displayName}が退出しました」` |

**Skip conditions:**
- Member is a bot
- No active TTS session for the guild
- Neither old nor new channel matches the TTS voice channel

### Speaker

Use the guild's default speaker (same resolution as `tts_speaker_settings` where `user_id IS NULL`). Falls back to `VOICEVOX_SPEAKER_ID` env if no guild default is set.

### Playback

Enqueue via the existing `TtsSessionManager.play()` path, using the same `LocalTtsPlaybackQueue` so announcements don't collide with message reads.

### New file

`apps/bot/src/discord/tts-announce.ts` — separate from `tts-auto-leave.ts` to keep responsibilities distinct.

**Files to modify:**
- `apps/bot/src/discord/tts-announce.ts` — new handler (create)
- `apps/bot/src/index.ts` (or wherever event handlers are registered) — register the `VoiceStateUpdate` listener for announcements

---

## Verification

| Area | How to verify |
|---|---|
| Speaker autocomplete | Run `/speaker set` in Discord, type a name fragment, confirm dropdown shows matching speakers with names |
| Dashboard preview | Open TTS dashboard, click 試聴 button, confirm audio plays in browser |
| Dictionary form | Open TTS dashboard, fill in form, submit, confirm new entry appears in the list |
| Join announcement | Start TTS session (`/join`), have another user join the VC, confirm bot reads `「○○が参加しました」` |
| Leave announcement | Have a user leave the TTS VC, confirm bot reads `「○○が退出しました」` |
| No announcement without session | Without an active TTS session, join a VC, confirm bot is silent |
| Bot self-announcement skip | Confirm the bot does not announce itself joining/leaving |
