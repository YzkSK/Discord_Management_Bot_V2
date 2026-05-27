# Phase7 Backup Archive Health Design

## Goal

Phase7 adds the first production-maintenance foundation: service health checks, PostgreSQL backups, and log archival. The goal is to make local Docker verification and future Linux Docker Compose operation easier to inspect without adding a full scheduler or deployment system yet.

## Scope

Phase7 includes:

- Health status for dashboard, database, Redis, and VOICEVOX.
- A Dashboard API endpoint for health checks.
- Docker healthcheck coverage where it fits the current services.
- PostgreSQL backup scripts that run inside Docker Compose.
- Log archive scripts for old `logs` rows.
- Logs for backup and health events where the application is already able to record them.
- Documentation for local verification and future production operation.

Phase7 does not include:

- Automated cron scheduling.
- Remote object storage.
- Encrypted offsite backups.
- Dashboard restore UI.
- Archive search in Dashboard.
- Full deployment automation.

## Health Design

Health checks are split into small probe functions so each dependency can be tested independently:

- `database`: run a lightweight SQL query.
- `redis`: send `PING`.
- `voicevox`: call the engine version endpoint.
- `dashboard`: expose an API response from `apps/dashboard`.

The Dashboard exposes `GET /api/health`. The endpoint returns an overall status and per-dependency details:

```json
{
  "status": "ok",
  "checkedAt": "2026-05-27T00:00:00.000Z",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "voicevox": { "status": "ok" }
  }
}
```

If at least one dependency fails, the endpoint returns HTTP 503 and marks the failed checks with `status: "error"` and a short message. Secrets and connection strings are never returned.

## Backup Design

Backups use `pg_dump` from the official PostgreSQL image. The first implementation is a manually-invoked Docker Compose service named `backup`.

The backup writes timestamped dumps to `/backups/postgres`:

```text
/backups/postgres/discord_bot_2026-05-27T12-00-00Z.sql.gz
```

Local Docker uses a bind mount `./backups:/backups`. This makes the output easy to inspect on Windows and keeps the eventual Linux layout close to production.

The backup command should fail loudly if `pg_dump` or gzip fails. Successful and failed backup events are recorded from application-side scripts where DB access is available.

## Archive Design

Archive is a manual script in Phase7. It targets old rows from `logs`:

- Rows older than 180 days are exported to gzip archive files.
- Rows older than 365 days are deleted.
- Archive files live under `/backups/archive`.

Archive files are not part of normal Dashboard search. Restore remains manual.

The archive implementation uses conservative batches and explicit cutoff dates so a failed run can be inspected. It records summary counts in system logs.

## Issue Breakdown

- Parent: `Phase7: backup archive health`
- Child: `Phase7: health check foundation`
- Child: `Phase7: postgres backup foundation`
- Child: `Phase7: logs archive foundation`
- Child: `Phase7: docs and verification`

## Verification

Phase7 completion requires:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --profile app config
docker compose run --rm backup
```

The health endpoint should be checked locally:

```bash
curl http://localhost:3000/api/health
```

On Windows, the backup output should appear under `./backups`.
