# Phase7 Maintenance

Phase7 adds health, PostgreSQL backup, and logs archive foundations for local Docker verification and future Linux Docker Compose operation.

## Health

Start the app stack:

```bash
docker compose --profile app up -d --build
```

Check Dashboard health:

```bash
curl http://localhost:3000/api/health
```

Expected when dependencies are available:

```json
{
  "status": "ok"
}
```

If one dependency is unavailable, the endpoint returns HTTP 503 with that dependency marked as `error`. The response does not include secrets or connection strings.

## Backup

Run a local PostgreSQL backup:

```bash
docker compose --profile maintenance run --rm backup
```

Output files are written under:

```text
./backups/postgres
```

Backup files are ignored by Git. Keep only `backups/.gitkeep` in the repository.

## Logs Archive

Run the manual logs archive foundation:

```bash
pnpm logs:archive
```

Archive files are written under:

```text
./backups/archive
```

Phase7 archive behavior:

- Logs older than 180 days are exported to `.json.gz`.
- Logs older than 365 days are deleted after export.
- Archive files are not searched by the Dashboard.
- Automatic scheduling is not included in Phase7.

## Verification

Use these commands for the Phase7 completion check:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --profile app config
docker compose --profile maintenance config
docker compose --profile maintenance run --rm backup
pnpm logs:archive
```

On Windows Docker Desktop, the generated files should appear under the repository's `backups` directory.
