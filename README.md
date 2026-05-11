# Discord Integrated Management Bot

Foundation for a Discord operations platform with bot, dashboard, database, Redis, VOICEVOX, CI, and GitHub Issue based development workflow.

The full product specification is in `discord_bot_complete_detailed_specification.md`.

## Requirements

- Node.js 24 LTS
- pnpm 10+
- Docker / Docker Compose

## Setup

```bash
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm build
```

On Linux/macOS, use `cp .env.example .env`.

## Docker Test Startup

For an all-Docker test startup, start Docker Desktop or the Linux Docker daemon, keep Discord secrets and app secrets in `.env`, then run:

```bash
docker compose --profile app up -d --build
docker compose --profile app logs -f bot
```

The app containers override service URLs internally, so the same `.env` can keep the local pnpm values:

```env
DATABASE_URL=postgres://discord_bot:discord_bot@localhost:5432/discord_bot
REDIS_URL=redis://localhost:6379
VOICEVOX_URL=http://localhost:50021
```

Inside Docker, Compose changes those URLs to `postgres`, `redis`, and `voicevox` service names. The dashboard is available at `http://localhost:3000`.

For Dashboard auth, the Discord Developer Portal OAuth2 redirect must include:

```text
http://localhost:3000/api/auth/callback/discord
```

The Dashboard uses Discord OAuth with `identify` and `guilds`. The server owner is treated as Dashboard `owner`; non-owner access is controlled by `dashboard_access_grants`.

To stop the Docker app stack:

```bash
docker compose --profile app down
```

## Scripts

- `pnpm dev`: run workspace dev tasks
- `pnpm build`: build all packages and apps
- `pnpm lint`: run static checks
- `pnpm typecheck`: run TypeScript checks
- `pnpm test`: run package test placeholders
- `pnpm db:generate`: generate Drizzle migrations
- `pnpm db:migrate`: apply Drizzle migrations

## Current Phase Status

- Phase0: repository, workspace, config, DB schema, Docker Compose, and CI foundation.
- Phase1: bot runtime, Discord client, `/setup`, guild registration, and startup logging.
- Phase2: logging ingestion, Redis Stream foundation, bot message log handlers, Dashboard logs API, and Dashboard logs page.
- Phase3: Dashboard Discord auth, owner/admin/viewer access checks, realtime logs Socket.io foundation, and guild settings foundation.
- Phase4: Temp VC database, voice state handler, generated voice channel lifecycle, and verification docs.

## Phase0 Completion Criteria

- Workspace, packages, apps, Docker Compose, Drizzle, config validation, and CI are present.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- `docker compose config` succeeds.
- `pnpm db:migrate` can apply the initial database schema.

## GitHub Workflow

Work is tracked with GitHub Issues.

- `main` is stable and protected.
- `phase/0-foundation` is the Phase0 integration branch.
- Issue work branches use `feature/issue-<number>-<short-name>`.
- PRs target `phase/0-foundation` during Phase0.
- Phase completion PRs target `main`.
- Branches are kept after merge for history, comparison, and reference.
- Squash merge is the default; regular merge is allowed when the internal commit history matters.

See `.github/ISSUE_TEMPLATE` and `.github/PULL_REQUEST_TEMPLATE` for the working format.

## Logging

Phase2 logging details are documented in `docs/logging-workflow.md`.

## Dashboard

Phase3 Dashboard access, auth, realtime, settings, and verification notes are documented in:

- `docs/dashboard-access.md`
- `docs/phase3-verification.md`

Phase4 Temp VC setup and verification notes are documented in:

- `docs/temp-vc.md`
