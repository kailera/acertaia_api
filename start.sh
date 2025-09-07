#!/usr/bin/env sh
set -e

echo "[start] Running Prisma migrations (migrate deploy)"
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[start] Running Prisma seed (RUN_SEED=true)"
  npm run seed || echo "[start] Seed failed (non-fatal)"
fi

echo "[start] Launching application"
node dist/index.js
