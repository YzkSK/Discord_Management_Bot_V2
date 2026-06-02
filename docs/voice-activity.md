# Voice Activity Sessions

Phase11 adds the foundation for visualizing active voice channel sessions.

## Behavior

- Human voice state transitions are tracked for all guild voice channels.
- Bot users are ignored for session membership.
- When the first human member joins a voice channel, an active row is created
  in `call_sessions`.
- While at least one human member remains, the session stays `active`.
- Members are tracked in `call_session_members`.
- When the final human member leaves, the session is marked `ended`.
- A voice channel move is handled as leaving the old channel and joining the
  new channel.

## Logs

- `call.started`
  - Written when a new active voice session is created.
  - Payload includes `sessionId`, `voiceChannelId`, and `startedAt`.
- `call.ended`
  - Written when the last human member leaves the voice channel.
  - Payload includes `sessionId`, `voiceChannelId`, and `endedAt`.

`voice.session.join`, `voice.session.leave`, and `voice.session.move` remain
gateway event logs. `call.started` and `call.ended` represent the aggregated
voice channel session state used by later status display features.

## Data

- `call_sessions`
  - `guild_id`
  - `channel_id`
  - `status`: `active` or `ended`
  - `started_at`
  - `ended_at`
- `call_session_members`
  - `call_session_id`
  - `user_id`
  - `join_order`
  - `joined_at`
  - `left_at`

No new schema is required for this foundation because Temp VC already introduced
the shared call session tables.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
```
