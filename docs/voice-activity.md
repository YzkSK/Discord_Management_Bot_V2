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

Apply the latest DB migration before testing because Phase11 stores the status
message id on `call_sessions`:

```bash
pnpm db:migrate
```

Register slash commands if the guild does not have `/setup voice-status` yet:

```bash
pnpm --filter @discord-bot/bot commands:register
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

## Bot Permissions

The bot needs permissions that allow it to:

- View channels.
- Manage channels, so `/setup voice-status` can append the marker to the
  channel topic.
- Send messages in the voice status text channel.
- Read message history in the voice status text channel.
- View voice channels, so Discord voice state events include the channel
  context the bot needs.

The voice status channel itself should allow the bot to post and edit its own
messages.

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

Manual check:

1. Apply DB migrations.
2. Register slash commands.
3. Run `/setup voice-status channel:<text channel>`.
4. Start the bot.
5. Have User A join any voice channel.
6. Confirm the status channel receives a Components V2 message with `Started`.
7. Keep User A in the voice channel for at least 1 minute.
8. Confirm the same status message is edited to `Active`.
9. Have User B join the same voice channel and confirm the session remains
   active.
10. Have User A leave while User B remains and confirm the session stays active.
11. Have User B leave.
12. Confirm the same status message is edited to `Ended` and remains visible.
13. Run a short call under 1 minute and confirm it goes from `Started` to
    `Ended` without an `Active` update.
14. Confirm Dashboard logs include `call.started` and `call.ended`.

Command check:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
pnpm db:migrate
docker compose --profile app build bot
```
