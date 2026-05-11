# Phase3 Verification

Phase3 adds Dashboard auth, access control, realtime logs, and a minimal guild
settings foundation.

## Scope

Implemented:

- Discord OAuth login for Dashboard.
- `owner`, `admin`, and `viewer` authorization checks.
- Protected Dashboard pages and APIs.
- Socket.io realtime log subscription foundation.
- Guild settings read/update foundation for `guild_configs.log_mode`.

Deferred:

- Final Dashboard UI polish.
- Dashboard access-management UI.
- Redis consumer groups and retry workers.
- Full production deployment hardening.

## Local Verification

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --profile app config
```

When Docker Desktop or the Linux Docker daemon is running, verify the app stack:

```bash
docker compose --profile app up -d --build
docker compose --profile app ps
docker compose --profile app logs -f dashboard
```

The Dashboard should be available at:

```text
http://localhost:3000
```

Stop the app stack with:

```bash
docker compose --profile app down
```

## Auth Check

Before checking Dashboard auth:

- `.env` contains Discord bot and OAuth credentials.
- Discord OAuth redirect includes
  `http://localhost:3000/api/auth/callback/discord`.
- `NEXTAUTH_URL` is `http://localhost:3000`.
- The bot is in the test guild.

Expected behavior:

- Unauthenticated Dashboard pages redirect to `/login`.
- The Discord server owner can access guild Dashboard data as `owner`.
- Non-owner users need a matching `dashboard_access_grants` user or role grant.
- `/api/logs` requires viewer-or-higher access.
- `/api/settings` reads require viewer-or-higher access.
- `/api/settings` writes require admin-or-owner access.

## Realtime Check

Open `/logs`, enter a guild ID, and load logs. The page opens a Socket.io
connection to `/socket.io` and subscribes with `logs:subscribe`.

Expected behavior:

- Realtime status changes when the socket connects.
- New realtime-enabled events are prepended to the logs list.
- High-frequency events such as `message.create` remain filtered out by the
  realtime policy unless explicitly enabled later.
- Durable ingestion still writes to PostgreSQL and `logs:events`.

## Settings Check

Open `/settings`, enter a guild ID with an initialized `guild_configs` row, and
load settings.

Expected behavior:

- Current `logMode` appears.
- Owner/admin can save `full`, `metadata_only`, or `disabled`.
- Viewer can read but receives `403` on save.
- A guild without setup-created config returns a not-initialized error.

## Completion Checklist

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm build` passes.
- `docker compose --profile app config` passes.
- `docker compose --profile app up -d --build` passes when Docker is running.
- Auth setup is documented.
- Realtime logs path is documented.
- Settings API/page behavior is documented.
- Current Dashboard UI polish is explicitly deferred.
