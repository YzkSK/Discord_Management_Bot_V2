# Phase8 Deploy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production Docker Compose overlay, nginx reverse proxy foundation, SSH deploy workflow skeleton, and production deployment docs.

**Architecture:** Keep local Docker Compose unchanged and add production behavior through an override file. Keep deployment as a manually triggered GitHub Actions workflow that SSHes into one Linux host and runs a repository script, leaving TLS automation and advanced rollout strategies for later.

**Tech Stack:** Docker Compose, nginx, GitHub Actions, SSH, Node.js 24, pnpm, Turborepo, Drizzle.

---

## File Map

- Create `docker-compose.prod.yml`: production Compose override with nginx and production service settings.
- Create `infra/nginx/default.conf`: nginx reverse proxy config for Dashboard.
- Create `.env.production.example`: production environment template with placeholders only.
- Create `scripts/deploy-prod.sh`: server-side deploy script.
- Create `.github/workflows/deploy.yml`: manually triggered SSH deploy workflow.
- Create `docs/deploy.md`: production deploy setup and verification guide.
- Modify `README.md`: add Phase8 status and docs link.

---

## Task 1: Production Compose Foundation

**Files:**
- Create: `docker-compose.prod.yml`
- Modify: `.env.production.example`

- [ ] **Step 1: Create the production env example**

Create `.env.production.example`:

```env
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=https://example.com/api/auth/callback/discord
DATABASE_URL=postgres://discord_bot:discord_bot@postgres:5432/discord_bot
REDIS_URL=redis://redis:6379
VOICEVOX_URL=http://voicevox:50021
VOICEVOX_SPEAKER_ID=2
VOICEVOX_CPU_NUM_THREADS=4
VOICEVOX_CPU_LIMIT=4
VOICEVOX_MEMORY_LIMIT=3g
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://example.com
SESSION_ENCRYPTION_KEY=
PUBLIC_DASHBOARD_URL=https://example.com
LOG_LEVEL=info
```

- [ ] **Step 2: Create the production Compose override**

Create `docker-compose.prod.yml`:

```yaml
services:
  bot:
    profiles: []
    restart: unless-stopped
    environment:
      PUBLIC_DASHBOARD_URL: ${PUBLIC_DASHBOARD_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}

  dashboard:
    profiles: []
    restart: unless-stopped
    ports: []
    environment:
      PUBLIC_DASHBOARD_URL: ${PUBLIC_DASHBOARD_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}

  nginx:
    image: nginx:1.29-alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./infra/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      dashboard:
        condition: service_started

  postgres:
    restart: unless-stopped

  redis:
    restart: unless-stopped

  voicevox:
    restart: unless-stopped

  backup:
    profiles:
      - maintenance
```

- [ ] **Step 3: Verify production Compose config**

Run:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

Expected: Compose renders successfully.

- [ ] **Step 4: Commit**

```bash
git add .env.production.example docker-compose.prod.yml
git commit -m "feat: add production compose foundation"
```

---

## Task 2: Nginx Reverse Proxy Foundation

**Files:**
- Create: `infra/nginx/default.conf`

- [ ] **Step 1: Add nginx config**

Create `infra/nginx/default.conf`:

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    location / {
        proxy_pass http://dashboard:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

- [ ] **Step 2: Verify production Compose config includes nginx**

Run:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

Expected: output contains the `nginx` service and no Dashboard public `3000:3000` port.

- [ ] **Step 3: Commit**

```bash
git add infra/nginx/default.conf docker-compose.prod.yml
git commit -m "feat: add nginx reverse proxy foundation"
```

---

## Task 3: SSH Deploy Workflow Foundation

**Files:**
- Create: `scripts/deploy-prod.sh`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add deploy script**

Create `scripts/deploy-prod.sh`:

```sh
#!/bin/sh
set -eu

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

echo "== backup =="
docker compose $COMPOSE_FILES --profile maintenance run --rm backup

echo "== update repository =="
git fetch origin main
git checkout main
git pull --ff-only origin main

echo "== install dependencies =="
pnpm install --frozen-lockfile

echo "== build =="
pnpm build

echo "== migrate =="
pnpm db:migrate

echo "== compose up =="
docker compose $COMPOSE_FILES up -d --build

echo "== health =="
docker compose $COMPOSE_FILES ps
```

- [ ] **Step 2: Add deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1.2.2
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          port: ${{ secrets.DEPLOY_PORT }}
          script: |
            set -eu
            cd "${{ secrets.DEPLOY_PATH }}"
            sh scripts/deploy-prod.sh
```

- [ ] **Step 3: Verify workflow syntax is readable**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml scripts/deploy-prod.sh
git commit -m "ci: add ssh deploy workflow foundation"
```

---

## Task 4: Production Docs And Verification

**Files:**
- Create: `docs/deploy.md`
- Modify: `README.md`

- [ ] **Step 1: Add deploy docs**

Create `docs/deploy.md`:

```md
# Production Deploy

Phase8 adds a Linux Docker Compose deploy foundation.

## Server Requirements

- Linux server with Docker and Docker Compose
- Node.js 24 and pnpm 10
- Git access to this repository
- Repository checked out at the path stored in `DEPLOY_PATH`
- Production `.env` created on the server from `.env.production.example`

## GitHub Secrets

Configure these repository or environment secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

## Manual Server Verification

On the server:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Manual Backup

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile maintenance run --rm backup
```

## GitHub Actions Deploy

Run the `Deploy` workflow manually from GitHub Actions. Phase8 does not auto-deploy on push.

## Not Included

- TLS certificate automation
- Blue/green deployment
- Offsite backup
- Multi-server deployment
```

- [ ] **Step 2: Update README**

Add Phase8 to Current Phase Status:

```md
- Phase8: production Compose, nginx reverse proxy, and SSH deploy workflow foundation.
```

Add docs link:

```md
Phase8 deploy setup and verification notes are documented in:

- `docs/deploy.md`
```

- [ ] **Step 3: Run final verification**

Run:

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

Expected: all commands pass.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/deploy.md
git commit -m "docs: add phase8 deploy verification"
```

---

## Phase Completion

- [ ] Push `phase/8-deploy-foundation`.
- [ ] Create child PRs from Issue branches into `phase/8-deploy-foundation`.
- [ ] After all child PRs pass and merge, create a Phase8 completion PR into `main`.
- [ ] Use Squash merge.
- [ ] Keep all branches after merge.

## Self-Review

- Production Compose is covered by Task 1.
- Nginx is covered by Task 2.
- SSH deploy workflow and server deploy script are covered by Task 3.
- Documentation and final verification are covered by Task 4.
- TLS automation, offsite backup, and blue/green deploy are explicitly out of scope.
