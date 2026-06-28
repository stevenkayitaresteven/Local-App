#!/bin/sh
set -e

# Apply database migrations before the server accepts traffic. Idempotent:
# `migrate deploy` only runs pending migrations.
echo "→ Applying database migrations…"
npx prisma migrate deploy

# Optionally seed on first boot (compose sets SEED_ON_START=true for demos).
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "→ Seeding database…"
  node --import tsx prisma/seed.ts 2>/dev/null || npx tsx prisma/seed.ts || echo "seed skipped"
fi

echo "→ Starting Umuturanyi API…"
exec "$@"
