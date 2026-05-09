# Discord Integrated Management Bot

Phase0 foundation for a Discord operations platform with bot, dashboard, database, Redis, VOICEVOX, CI, and GitHub Issue based development workflow.

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

## Scripts

- `pnpm dev`: run workspace dev tasks
- `pnpm build`: build all packages and apps
- `pnpm lint`: run static checks
- `pnpm typecheck`: run TypeScript checks
- `pnpm test`: run package test placeholders
- `pnpm db:generate`: generate Drizzle migrations
- `pnpm db:migrate`: apply Drizzle migrations

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
