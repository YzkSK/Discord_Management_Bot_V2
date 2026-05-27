#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
DATABASE_URL="${DATABASE_URL:-postgres://discord_bot:discord_bot@postgres:5432/discord_bot}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/discord_bot_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" | gzip -c > "$OUTPUT_FILE"
test -s "$OUTPUT_FILE"

echo "Created backup: $OUTPUT_FILE"
