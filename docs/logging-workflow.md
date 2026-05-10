# Phase2 Logging Workflow

Phase2 adds the first end-to-end logging foundation:

```text
Discord message event
-> packages/discord-core normalized event adapter
-> event dispatcher
-> packages/logger ingestion service
-> PostgreSQL logs table
-> Redis Stream
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
  - Writes message logs to PostgreSQL and Redis.
  - Keeps handler errors isolated from the bot runtime.
- `apps/dashboard`
  - Exposes `GET /api/logs`.
  - Provides `/logs` with search, filters, paging, and raw payload review.

Not implemented in Phase2:

- Dashboard authentication and RBAC.
- Socket.io realtime UI subscriptions.
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

Response shape:

```json
{
  "items": [],
  "nextCursor": null
}
```

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
