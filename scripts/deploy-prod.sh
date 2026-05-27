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
