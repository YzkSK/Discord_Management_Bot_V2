#!/usr/bin/env sh
set -eu

gh issue create --title "Phase0: foundation setup" --body-file ".github/ISSUE_TEMPLATE/phase0-parent.md"
gh issue create --title "Phase0: repository bootstrap" --body "Create git, workspace, Turborepo, TypeScript base config, .gitignore, and README. Verify with pnpm lint and pnpm typecheck."
gh issue create --title "Phase0: package skeleton" --body "Create apps/bot, apps/dashboard, packages/config, packages/db, and packages/shared boundaries. Verify with pnpm build."
gh issue create --title "Phase0: config env validation" --body "Add zod env validation, typed config exports, and .env.example. Verify with pnpm --filter @discord-bot/config typecheck."
gh issue create --title "Phase0: drizzle database foundation" --body "Add Drizzle config, database client, initial guilds/guild_configs/logs schema, and migration commands. Verify with docker compose up -d postgres redis, pnpm db:generate, and pnpm db:migrate."
gh issue create --title "Phase0: docker compose foundation" --body "Add postgres, redis, voicevox, bot, and dashboard compose services. Verify with docker compose config."
gh issue create --title "Phase0: CI checks" --body "Add GitHub Actions for lint, typecheck, test, build, and docker compose config."
gh issue create --title "Phase0: docs and git workflow" --body "Document Issue workflow, branch naming, PR rules, merge policy, and branch protection rules."
