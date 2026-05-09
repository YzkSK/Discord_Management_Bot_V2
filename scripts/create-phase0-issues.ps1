$ErrorActionPreference = "Stop"

$issues = @(
  @{
    Title = "Phase0: foundation setup"
    Body = @"
## Purpose
Track Phase0 foundation work across repository setup, package skeletons, config, database, Docker, CI, and documentation.

## Child Issues
- [ ] Phase0: repository bootstrap
- [ ] Phase0: package skeleton
- [ ] Phase0: config env validation
- [ ] Phase0: drizzle database foundation
- [ ] Phase0: docker compose foundation
- [ ] Phase0: CI checks
- [ ] Phase0: docs and git workflow

## Done When
- [ ] All child issues are closed
- [ ] Phase0 completion PR is merged into main
- [ ] pnpm lint passes
- [ ] pnpm typecheck passes
- [ ] pnpm test passes
- [ ] pnpm build passes
- [ ] docker compose config passes
- [ ] pnpm db:migrate passes against local PostgreSQL
"@
  },
  @{
    Title = "Phase0: repository bootstrap"
    Body = @"
## Purpose
Initialize the repository foundation.

## Scope
- git repository setup
- .gitignore
- README
- pnpm workspace
- Turborepo
- TypeScript base config

## Done When
- [ ] Workspace scripts are present
- [ ] TypeScript base config is present
- [ ] README explains Phase0 setup

## Verification Commands
````bash
pnpm lint
pnpm typecheck
````
"@
  },
  @{
    Title = "Phase0: package skeleton"
    Body = @"
## Purpose
Create the initial app and package boundaries.

## Scope
- apps/bot
- apps/dashboard
- packages/config
- packages/db
- packages/shared

## Done When
- [ ] Each workspace has a package.json
- [ ] Package boundaries match the specification
- [ ] Shared package has no db or discord.js dependency

## Verification Commands
````bash
pnpm build
````
"@
  },
  @{
    Title = "Phase0: config env validation"
    Body = @"
## Purpose
Centralize environment validation.

## Scope
- zod validation
- typed config exports
- .env.example
- avoid direct process.env usage outside config boundaries

## Done When
- [ ] App env validation exists
- [ ] Database-only env validation exists
- [ ] .env.example lists required keys

## Verification Commands
````bash
pnpm --filter @discord-bot/config typecheck
````
"@
  },
  @{
    Title = "Phase0: drizzle database foundation"
    Body = @"
## Purpose
Create the initial Drizzle/PostgreSQL foundation.

## Scope
- Drizzle config
- database client
- initial schema
- migration commands
- guilds, guild_configs, logs

## Done When
- [ ] Discord IDs are text
- [ ] Internal references use uuid FK
- [ ] logs contains payload jsonb and realtime_enabled

## Verification Commands
````bash
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
````
"@
  },
  @{
    Title = "Phase0: docker compose foundation"
    Body = @"
## Purpose
Add local and Linux Docker foundations.

## Scope
- postgres
- redis
- voicevox
- bot
- dashboard

## Done When
- [ ] Compose file validates
- [ ] Database and Redis healthchecks exist
- [ ] VOICEVOX resource limits are documented

## Verification Commands
````bash
docker compose config
````
"@
  },
  @{
    Title = "Phase0: CI checks"
    Body = @"
## Purpose
Run required checks for PRs and protected branches.

## Scope
- GitHub Actions
- lint
- typecheck
- test
- build
- docker compose config

## Done When
- [ ] CI runs on PRs to main and phase branches
- [ ] CI runs on pushes to main and phase branches

## Verification Commands
````bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config
````
"@
  },
  @{
    Title = "Phase0: docs and git workflow"
    Body = @"
## Purpose
Document Issue, branch, PR, and merge rules.

## Scope
- Issue workflow
- branch naming
- PR rules
- merge policy
- protection rules

## Done When
- [ ] docs/git-workflow.md exists
- [ ] Issue templates exist
- [ ] PR template exists

## Verification Commands
````bash
pnpm lint
````
"@
  }
)

foreach ($issue in $issues) {
  gh issue create --title $issue.Title --body $issue.Body
}
