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
