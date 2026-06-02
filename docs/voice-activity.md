# Voice Activity Sessions

Phase11 adds the foundation for visualizing active voice channel sessions.

## Setup

Run this in a guild to mark a text channel as the voice status display channel:

```text
/setup voice-status channel:<text channel>
```

The bot stores this without a guild config column by appending this marker to
the channel topic:

```text
[discord-management-bot:voice-status]
```

## Behavior

- Human voice state transitions are tracked for all guild voice channels.
- Bot users are ignored for session membership.
- When the first human member joins a voice channel, an active row is created
  in `call_sessions`.
- The status channel receives a Components V2 message with `Started`.
- If the call is still active after 1 minute, the same status message is updated
  to `Active`.
- While at least one human member remains, the session stays `active`.
- Members are tracked in `call_session_members`.
- When the final human member leaves, the session is marked `ended`.
- The same status message is updated to `Ended` and kept as history.
- Calls shorter than 1 minute go from `Started` to `Ended` without an `Active`
  update.
- A voice channel move is handled as leaving the old channel and joining the
  new channel.
- If the status message update fails, the failure is written through
  `system.handler.error` with `voice.status.update_failed` as the source event.

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
  - `status_message_id`
  - `status`: `active` or `ended`
  - `started_at`
  - `ended_at`
- `call_session_members`
  - `call_session_id`
  - `user_id`
  - `join_order`
  - `joined_at`
  - `left_at`

The shared call session tables are also used by Temp VC. The
`status_message_id` column lets the bot edit the same Discord message as a
session changes from `Started` to `Active` to `Ended`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
```
