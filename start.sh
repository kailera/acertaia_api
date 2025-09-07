#!/usr/bin/env sh
set -e

echo "[start] Running Prisma migrations (migrate deploy)"
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[start] Running Prisma seed (RUN_SEED=true)"
  npm run seed || echo "[start] Seed failed (non-fatal)"
fi

echo "[start] Launching application"
if [ -f ./.buildinfo ]; then
  echo "[start] Build info:" && cat ./.buildinfo || true
fi
echo "[start] Using PORT=${PORT:-unset} NODE_ENV=${NODE_ENV}"
node dist/index.js
