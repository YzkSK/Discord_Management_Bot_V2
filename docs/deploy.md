# Production Deploy

Phase8 adds a Linux Docker Compose deploy foundation. Phase13 adds the
HTTPS deployment foundation for production nginx.

## Server Requirements

- Linux server with Docker and Docker Compose
- Node.js 24 and pnpm 10
- Git access to this repository
- Repository checked out at the path stored in `DEPLOY_PATH`
- Production `.env` created on the server from `.env.production.example`
- A DNS record pointing the production domain to the server
- TLS certificates available on the server when HTTPS is enabled

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
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

This starts the production stack with nginx on HTTP port `80`. Use it for
first bootstrapping, internal testing, or certificate issuance workflows that
need plain HTTP.

## HTTPS Production

For public production access, run nginx with the TLS override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml ps
```

The TLS override publishes ports `80` and `443`, redirects HTTP traffic to
HTTPS, and mounts certificates into nginx. By default nginx reads:

- `./secrets/tls/fullchain.pem`
- `./secrets/tls/privkey.pem`

Override the certificate directory with `TLS_CERT_DIR` in the production `.env`
file:

```env
TLS_CERT_DIR=/etc/letsencrypt/live/example.com
```

The certificate directory is mounted read-only at `/etc/nginx/certs`. Do not
commit certificates, private keys, or the `secrets/` directory.

Set these production URLs to the public HTTPS origin:

```env
PUBLIC_DASHBOARD_URL=https://example.com
NEXTAUTH_URL=https://example.com
DISCORD_REDIRECT_URI=https://example.com/api/auth/callback/discord
```

In the Discord Developer Portal, the OAuth2 redirect URI must exactly match
`DISCORD_REDIRECT_URI`.

## HTTP and HTTPS Difference

- HTTP production compose exposes only nginx port `80`.
- HTTPS production compose exposes nginx ports `80` and `443`.
- In HTTPS mode, nginx terminates TLS and proxies to `dashboard:3000` inside
  Docker.
- The dashboard service should not expose port `3000` publicly in production.
- `NEXTAUTH_URL` and Discord OAuth redirect URLs must use `https://`.

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
