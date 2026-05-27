# Phase7 Backup Archive Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase7 health checks, PostgreSQL backups, log archival scripts, and verification docs.

**Architecture:** Keep health probes in small TypeScript modules and expose them through the Dashboard API. Keep backup and archive as manually-invoked Docker/script foundations, leaving scheduling and offsite storage for a later phase.

**Tech Stack:** Node.js 24, pnpm, Turborepo, TypeScript, Next.js, Drizzle, PostgreSQL, Redis, Docker Compose, Vitest/node:test.

---

## File Map

- Create `packages/shared/src/health.ts`: shared health result types and status aggregation.
- Create `packages/shared/src/health.test.ts`: unit tests for health status aggregation.
- Create `apps/dashboard/src/app/api/health/route.ts`: Dashboard health API.
- Create `apps/dashboard/src/app/api/health/route.test.ts`: route-level tests using mocked probes where practical.
- Create `packages/db/src/maintenance/archive-logs.ts`: log archive query helpers and cutoff calculation.
- Create `packages/db/src/maintenance/archive-logs.test.ts`: archive cutoff and summary tests.
- Create `scripts/backup-postgres.sh`: manual PostgreSQL backup script used by Docker Compose.
- Create `scripts/archive-logs.ts`: manual archive runner.
- Modify `docker-compose.yml`: add `backup` service and `./backups:/backups` bind mount.
- Modify `package.json`: add maintenance scripts.
- Modify `README.md`: add Phase7 status and doc link.
- Create `docs/phase7-maintenance.md`: health, backup, archive verification notes.

---

## Task 1: Health Result Model

**Files:**
- Create: `packages/shared/src/health.ts`
- Create: `packages/shared/src/health.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the health aggregation tests**

Create `packages/shared/src/health.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeHealthChecks } from "./health.js";

describe("summarizeHealthChecks", () => {
  it("returns ok when every check is ok", () => {
    expect(
      summarizeHealthChecks({
        database: { status: "ok" },
        redis: { status: "ok" }
      })
    ).toBe("ok");
  });

  it("returns error when any check has failed", () => {
    expect(
      summarizeHealthChecks({
        database: { status: "ok" },
        redis: { status: "error", message: "Redis ping failed." }
      })
    ).toBe("error");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
pnpm --filter @discord-bot/shared test
```

Expected: the test fails because `health.ts` does not exist.

- [ ] **Step 3: Add the shared health model**

Create `packages/shared/src/health.ts`:

```ts
export type HealthStatus = "ok" | "error";

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
}

export type HealthCheckMap = Record<string, HealthCheckResult>;

export interface HealthReport {
  status: HealthStatus;
  checkedAt: string;
  checks: HealthCheckMap;
}

export function summarizeHealthChecks(checks: HealthCheckMap): HealthStatus {
  return Object.values(checks).some((check) => check.status === "error")
    ? "error"
    : "ok";
}
```

Export it from `packages/shared/src/index.ts`:

```ts
export * from "./health.js";
```

- [ ] **Step 4: Verify shared tests**

Run:

```bash
pnpm --filter @discord-bot/shared test
```

Expected: shared tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/health.ts packages/shared/src/health.test.ts packages/shared/src/index.ts
git commit -m "feat: add shared health model"
```

---

## Task 2: Dashboard Health Endpoint

**Files:**
- Create: `apps/dashboard/src/app/api/health/route.ts`
- Create: `apps/dashboard/src/app/api/health/route.test.ts`
- Modify: `apps/dashboard/package.json` if test config needs the new route test.

- [ ] **Step 1: Write tests for response status mapping**

Create `apps/dashboard/src/app/api/health/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toHealthHttpStatus } from "./route.js";

describe("toHealthHttpStatus", () => {
  it("returns 200 for ok reports", () => {
    expect(toHealthHttpStatus("ok")).toBe(200);
  });

  it("returns 503 for error reports", () => {
    expect(toHealthHttpStatus("error")).toBe(503);
  });
});
```

- [ ] **Step 2: Run the dashboard test and confirm it fails**

Run:

```bash
pnpm --filter @discord-bot/dashboard test
```

Expected: the test fails because the route does not exist.

- [ ] **Step 3: Implement the route**

Create `apps/dashboard/src/app/api/health/route.ts`:

```ts
import { createDbConnection } from "@discord-bot/db";
import { summarizeHealthChecks, type HealthCheckResult } from "@discord-bot/shared";
import { createClient } from "redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    voicevox: await checkVoicevox()
  };
  const status = summarizeHealthChecks(checks);

  return NextResponse.json(
    {
      status,
      checkedAt: new Date().toISOString(),
      checks
    },
    { status: toHealthHttpStatus(status) }
  );
}

export function toHealthHttpStatus(status: "ok" | "error") {
  return status === "ok" ? 200 : 503;
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startedAt = Date.now();
  const connection = createDbConnection();

  try {
    await connection.db.execute("select 1");
    return { status: "ok", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: "error", message: normalizeErrorMessage(error) };
  } finally {
    await connection.close();
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  const startedAt = Date.now();
  const client = createClient({ url: process.env.REDIS_URL });

  try {
    await client.connect();
    await client.ping();
    return { status: "ok", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: "error", message: normalizeErrorMessage(error) };
  } finally {
    await client.disconnect().catch(() => undefined);
  }
}

async function checkVoicevox(): Promise<HealthCheckResult> {
  const startedAt = Date.now();
  const baseUrl = process.env.VOICEVOX_URL ?? "http://localhost:50021";

  try {
    const response = await fetch(`${baseUrl}/version`);
    if (!response.ok) {
      return { status: "error", message: `VOICEVOX returned ${response.status}.` };
    }
    return { status: "ok", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: "error", message: normalizeErrorMessage(error) };
  }
}

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
```

- [ ] **Step 4: Verify dashboard tests and typecheck**

Run:

```bash
pnpm --filter @discord-bot/dashboard test
pnpm --filter @discord-bot/dashboard typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/api/health/route.ts apps/dashboard/src/app/api/health/route.test.ts
git commit -m "feat: add dashboard health endpoint"
```

---

## Task 3: PostgreSQL Backup Foundation

**Files:**
- Create: `scripts/backup-postgres.sh`
- Modify: `docker-compose.yml`
- Modify: `.gitignore`

- [ ] **Step 1: Add backup output ignore rules**

Add to `.gitignore`:

```gitignore
backups/
!backups/.gitkeep
```

- [ ] **Step 2: Create the backup script**

Create `scripts/backup-postgres.sh`:

```sh
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
```

- [ ] **Step 3: Add the backup service to Docker Compose**

Add this service to `docker-compose.yml`:

```yaml
  backup:
    image: postgres:17-alpine
    env_file:
      - .env
    environment:
      DATABASE_URL: postgres://discord_bot:discord_bot@postgres:5432/discord_bot
      BACKUP_DIR: /backups/postgres
    volumes:
      - ./scripts/backup-postgres.sh:/usr/local/bin/backup-postgres.sh:ro
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    entrypoint: ["/bin/sh", "/usr/local/bin/backup-postgres.sh"]
    profiles:
      - maintenance
```

- [ ] **Step 4: Verify Compose config**

Run:

```bash
docker compose --profile maintenance config
```

Expected: Compose renders successfully.

- [ ] **Step 5: Commit**

```bash
git add .gitignore docker-compose.yml scripts/backup-postgres.sh
git commit -m "feat: add postgres backup service"
```

---

## Task 4: Logs Archive Foundation

**Files:**
- Create: `packages/db/src/maintenance/archive-logs.ts`
- Create: `packages/db/src/maintenance/archive-logs.test.ts`
- Create: `scripts/archive-logs.ts`
- Modify: `packages/db/package.json`
- Modify: `package.json`

- [ ] **Step 1: Write cutoff tests**

Create `packages/db/src/maintenance/archive-logs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateArchiveCutoffs } from "./archive-logs.js";

describe("calculateArchiveCutoffs", () => {
  it("uses 180 and 365 day cutoffs", () => {
    const now = new Date("2026-05-27T00:00:00.000Z");
    const cutoffs = calculateArchiveCutoffs(now);

    expect(cutoffs.archiveBefore.toISOString()).toBe("2025-11-28T00:00:00.000Z");
    expect(cutoffs.deleteBefore.toISOString()).toBe("2025-05-27T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run the DB test and confirm it fails**

Run:

```bash
pnpm --filter @discord-bot/db test
```

Expected: the test fails because `archive-logs.ts` does not exist.

- [ ] **Step 3: Implement archive helpers**

Create `packages/db/src/maintenance/archive-logs.ts`:

```ts
export interface ArchiveCutoffs {
  archiveBefore: Date;
  deleteBefore: Date;
}

export interface ArchiveSummary {
  archiveBefore: string;
  deleteBefore: string;
  archivedCount: number;
  deletedCount: number;
  outputPath: string;
}

export function calculateArchiveCutoffs(now = new Date()): ArchiveCutoffs {
  return {
    archiveBefore: subtractDays(now, 180),
    deleteBefore: subtractDays(now, 365)
  };
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}
```

- [ ] **Step 4: Add archive runner script**

Create `scripts/archive-logs.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createDbConnection } from "@discord-bot/db";
import { calculateArchiveCutoffs } from "../packages/db/src/maintenance/archive-logs.js";

const archiveDir = process.env.ARCHIVE_DIR ?? "backups/archive";
const now = new Date();
const cutoffs = calculateArchiveCutoffs(now);
const outputPath = join(
  archiveDir,
  `logs_${now.toISOString().slice(0, 10)}.json`
);

await mkdir(archiveDir, { recursive: true });

const connection = createDbConnection();
try {
  const rows = await connection.db.execute(
    `select * from logs where received_at < '${cutoffs.archiveBefore.toISOString()}' order by received_at asc`
  );
  await writeFile(outputPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Archived logs before ${cutoffs.archiveBefore.toISOString()} to ${outputPath}`);
} finally {
  await connection.close();
}
```

- [ ] **Step 5: Add scripts**

In `packages/db/package.json`, add:

```json
"archive:logs": "tsx ../../scripts/archive-logs.ts"
```

In root `package.json`, add:

```json
"logs:archive": "pnpm --filter @discord-bot/db archive:logs"
```

- [ ] **Step 6: Verify DB tests**

Run:

```bash
pnpm --filter @discord-bot/db test
pnpm --filter @discord-bot/db typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/maintenance/archive-logs.ts packages/db/src/maintenance/archive-logs.test.ts scripts/archive-logs.ts packages/db/package.json package.json
git commit -m "feat: add logs archive foundation"
```

---

## Task 5: Phase7 Docs And Verification

**Files:**
- Create: `docs/phase7-maintenance.md`
- Modify: `README.md`

- [ ] **Step 1: Write the maintenance docs**

Create `docs/phase7-maintenance.md`:

```md
# Phase7 Maintenance

Phase7 adds health, PostgreSQL backup, and log archive foundations.

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
{ "status": "ok" }
```

## Backup

Run a local PostgreSQL backup:

```bash
docker compose --profile maintenance run --rm backup
```

Output files are written under:

```text
./backups/postgres
```

## Archive

Run the manual archive foundation:

```bash
pnpm logs:archive
```

Archive output is written under:

```text
./backups/archive
```

Phase7 does not schedule archive jobs automatically.
```

- [ ] **Step 2: Update README Phase status**

Add Phase7 to the current phase status section:

```md
- Phase7: health checks, PostgreSQL backup foundation, and logs archive foundation.
```

Add the docs link:

```md
Phase7 maintenance setup and verification notes are documented in:

- `docs/phase7-maintenance.md`
```

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --profile app config
docker compose --profile maintenance config
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/phase7-maintenance.md
git commit -m "docs: add phase7 maintenance verification"
```

---

## Phase Completion

- [ ] Push `phase/7-backup-archive-health`.
- [ ] Create child PRs from Issue branches into `phase/7-backup-archive-health`.
- [ ] After all child PRs pass and merge, create a Phase7 completion PR into `main`.
- [ ] Use Squash merge.
- [ ] Keep all branches after merge.

## Self-Review

- Health is covered by Tasks 1 and 2.
- Backup is covered by Task 3.
- Archive is covered by Task 4.
- Documentation and verification are covered by Task 5.
- Scheduling, offsite storage, restore UI, and archive Dashboard search are explicitly out of scope.
