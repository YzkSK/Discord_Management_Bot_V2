# Phase2 Logging Workflow

Phase2 adds the first end-to-end logging foundation:

```text
Discord gateway event
-> packages/discord-core normalized event adapter
-> event dispatcher
-> packages/logger ingestion service
-> PostgreSQL logs table
-> Redis Stream
-> configured Discord log channel
-> Dashboard /api/logs
-> Dashboard /logs
```

## Scope

Implemented in Phase2:

- `packages/logger`
  - Converts `NormalizedEvent` into DB log insert input.
  - Applies the realtime default policy from `packages/shared`.
  - Converts handler failures into `system.handler.error` log events.
- `packages/redis`
  - Creates the Redis connection boundary.
  - Serializes log events for Redis Stream fields.
  - Appends durable events to `logs:events`.
  - Appends realtime guild events to `rt:logs:<guildId>`.
- `apps/bot`
  - Handles `message.create`, `message.update`, and `message.delete`.
  - Handles guild update, member join/leave/kick/ban/unban/update/timeout,
    channel create/update/delete, role create/update/delete, thread
    create/update/delete, invite create/delete, emoji create/update/delete,
    sticker create/update/delete, reaction add/remove, message bulk delete,
    voice join/leave/move/state update, and webhook update events.
  - Aggregates human voice activity into `call.started` and `call.ended`
    session logs for voice status visualization.
  - Uses Discord Audit Log lookup for moderation and server-management events
    when the bot has `View Audit Log`, filling `actorId` and
    `payload.auditLog`.
  - Writes message logs to PostgreSQL and Redis.
  - Sends message log summaries to the configured Discord log channel when one
    is marked.
  - Keeps handler errors isolated from the bot runtime.
- `apps/dashboard`
  - Exposes `GET /api/logs`.
  - Provides `/logs` with search, filters, paging, and raw payload review.
  - Serves the first Socket.io realtime log subscription path.

Not implemented in Phase2:

- Dashboard authentication and RBAC.
- Redis consumer groups, pending recovery, and retry workers.
- Full Discord event coverage beyond message events.
- Live production deployment.

## Redis Stream Keys

- `logs:events`
  - Durable log event stream for worker/retry expansion.
- `rt:logs:<guildId>`
  - Per-guild realtime stream foundation.
  - Only receives events whose realtime policy resolves to enabled.

High-frequency events such as `message.create` remain realtime disabled by default. Important update/delete/system-error events are realtime enabled by default.

## Realtime Dashboard Logs

Phase3 adds a Socket.io foundation for live log delivery.

- Socket path: `/socket.io`
- Subscribe event: `logs:subscribe`
- Payload: `{ "guildId": "<discord guild id>" }`
- Server event: `logs:event`
- Error event: `logs:error`

The Dashboard logs page opens the socket only after a guild ID is selected. The socket uses the same browser session cookie as the Dashboard and checks viewer-or-higher access before reading from `rt:logs:<guildId>`.

Realtime delivery reads from the per-guild Redis Stream and does not replace durable ingestion. All events still go through PostgreSQL and the durable `logs:events` stream first. The realtime policy remains the filter for high-frequency events, so `message.create` is still not streamed by default.

## Discord Log Channel

Run this in a guild to mark a Discord text channel as the log delivery channel:

```text
/setup logs channel:<text channel>
```

The bot stores this without a database column by appending this marker to the
channel topic:

```text
[discord-management-bot:logs]
```

When Discord events are detected, the bot writes the event to PostgreSQL and
Redis for the Dashboard, then posts a Components V2 log summary to the marked
channel. Bot-authored message events are skipped.

For actions where Discord Gateway does not include the executor, the bot checks
the guild Audit Log and attaches the matching entry to `payload.auditLog`. This
requires the Japanese Discord permission `監査ログを表示` / English permission
`View Audit Log`. Without that permission, the event is still logged and
`payload.auditLog.status` becomes `missing_permission`.

## Dashboard Logs API

`GET /api/logs` supports these query parameters:

- `limit`: 1 to 100, default 50.
- `before`: ISO timestamp cursor based on `receivedAt`.
- `guildId`
- `eventName`
- `actorId`
- `channelId`
- `messageId`
- `search`: event name search.
  - Also searches the JSON payload text, so Temp VC `callSessionId`,
    `ownerId`, and channel names can be found even when Discord channel ids are
    short-lived.

Response shape:

```json
{
  "accessRole": "viewer",
  "items": [],
  "nextCursor": null
}
```

## Phase12 Logs UX

Phase12 completes the first Dashboard Logs UX pass:

- Category tabs:
  - All
  - Messages
  - Voice
  - Temp VC
  - Recruitment
  - Audit
  - TTS
  - System
- Realtime status display for idle, connecting, live, offline, and error states.
- Human View summaries remain visible for every Dashboard role.
- Raw JSON is visible only for `owner` and `admin`.
- `viewer` users can search, filter, page, and read Human View summaries, but
  cannot expand raw payloads.

## Verification

Phase2 verification commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config
```

When Docker is available, also verify:

```bash
docker compose up -d postgres redis
pnpm db:migrate
```

## Bot Operation Check Handoff

At the end of Phase2, tell the user what they need to do before the first bot operation check:

- Fill `.env` from `.env.example`.
- Create or confirm the Discord application and bot token.
- Enable the required bot privileged intents in the Discord Developer Portal.
- Invite the bot to a test guild with the required permissions.
- Start PostgreSQL and Redis.
- Apply DB migrations.
- Register slash commands.
- Start the bot.
- Send, edit, and delete a test message in the guild.
- Open Dashboard `/logs` and confirm log rows appear.

Use exact commands in the final Phase2 handoff so the user can run the check without guessing.
