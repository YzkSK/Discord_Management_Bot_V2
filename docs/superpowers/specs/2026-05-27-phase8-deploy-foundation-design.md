# Phase8 Deploy Foundation Design

## Goal

Phase8 adds the first production deploy foundation for a Linux server running Docker Compose. It should make production startup, reverse proxying, and GitHub Actions based SSH deployment understandable and repeatable without forcing a fully automated production rollout yet.

## Scope

Phase8 includes:

- A production Compose overlay for Linux operation.
- An nginx reverse proxy foundation for Dashboard HTTP traffic.
- A production environment example file.
- A GitHub Actions deploy workflow skeleton using SSH.
- Deployment scripts that run the known deploy flow: backup, pull, build, migrate, compose up.
- Documentation for required server paths, GitHub Secrets, and verification.

Phase8 does not include:

- Real production secrets.
- Domain-specific TLS certificate automation.
- Blue/green deployment.
- Multi-server deployment.
- Object storage backup.
- Monitoring services beyond the Phase7 health endpoint.

## Production Compose Design

The existing `docker-compose.yml` remains the local default. Phase8 adds `docker-compose.prod.yml` as an override that:

- Enables app services without requiring the local `app` profile.
- Adds `nginx`.
- Keeps service-to-service URLs on Docker network names.
- Avoids publishing Dashboard directly in production; nginx owns the public HTTP port.
- Uses bind-mounted `./backups:/backups` for continuity with Phase7.

The local verification command is:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

## Nginx Design

Nginx is a small reverse proxy in `infra/nginx/default.conf`. It proxies `/` to `dashboard:3000` and forwards standard proxy headers. Phase8 keeps HTTP only. TLS termination can be added later by mounting certificates or by putting another reverse proxy in front.

## Deploy Workflow Design

The workflow file is `.github/workflows/deploy.yml`. It is manually triggered with `workflow_dispatch` and uses GitHub Secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

The workflow SSHes into the server and runs `scripts/deploy-prod.sh`. The script expects the repository to already exist at `DEPLOY_PATH` and uses the deploy flow from the specification:

```text
backup
git pull
pnpm install
pnpm build
pnpm db:migrate
docker compose up -d --build
health check
```

The first implementation is explicit and conservative. It fails fast and prints command boundaries, but it does not embed secrets.

## Issue Breakdown

- Parent: `Phase8: deploy foundation`
- Child: `Phase8: production compose foundation`
- Child: `Phase8: nginx reverse proxy foundation`
- Child: `Phase8: GitHub Actions SSH deploy foundation`
- Child: `Phase8: production docs and verification`

## Verification

Phase8 completion requires:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config
docker compose --profile app config
docker compose --profile maintenance config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

The deploy workflow itself is not run against a real server during Phase8 unless server secrets are configured.
