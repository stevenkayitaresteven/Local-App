# Deployment

## Environment

Copy `.env.example` → `.env`. The configuration is validated at startup
(`apps/api/src/config/env.ts`) — the API refuses to boot on an invalid environment, and
refuses to start in production while the JWT secrets are still the dev defaults.

Generate strong secrets:

```bash
openssl rand -hex 48   # JWT_ACCESS_SECRET
openssl rand -hex 48   # JWT_REFRESH_SECRET
```

Key variables: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`WEB_ORIGIN` (CORS allow-list, comma-separated), `API_PUBLIC_URL` (used to build upload
URLs), `STORAGE_DRIVER` (`local`|`s3`), and the optional `REDIS_URL`, `SMTP_URL`, and S3
settings.

## Docker

```bash
# API on SQLite (persisted in a named volume) — zero extra services
JWT_ACCESS_SECRET=$(openssl rand -hex 48) \
JWT_REFRESH_SECRET=$(openssl rand -hex 48) \
docker compose up --build

# also seed demo data on first boot
SEED_ON_START=true docker compose up --build
```

The image is multi-stage (`apps/api/Dockerfile`): it installs deps, builds the shared
package, generates the Prisma client, compiles the API, prunes dev deps, and runs as a
non-root user. The entrypoint applies migrations (`prisma migrate deploy`) before serving and
exposes a Docker `HEALTHCHECK` against `/healthz`.

## Switching to PostgreSQL (production)

The models are Postgres-compatible. To switch:

1. In `apps/api/prisma/schema.prisma`, set the datasource `provider = "postgresql"`.
2. Point `DATABASE_URL` at Postgres, e.g.
   `postgresql://umuturanyi:umuturanyi@postgres:5432/umuturanyi?schema=public`.
3. Regenerate migrations for Postgres (`npx prisma migrate dev --name init` against a Postgres
   dev DB) — SQLite and Postgres DDL differ slightly, so generate the production migration
   against Postgres.
4. Bring up the bundled Postgres service:

   ```bash
   docker compose --profile postgres up --build
   ```

## Caching & realtime at scale

- The default `cache.ts` is in-process. For multi-node, implement the `Cache` interface with
  Redis (`REDIS_URL` is already wired into config) and swap the export — no call sites change.
- Socket.IO scales horizontally with the Redis adapter; the per-user/room model in
  `realtime/socket.ts` is adapter-ready.
- The domain-event bus (`lib/events.ts`) is the seam for moving notification/analytics work to
  a queue + worker.

## Object storage

`STORAGE_DRIVER=local` writes under `STORAGE_LOCAL_DIR` and serves files at `/uploads`. For
production, implement the `Storage` interface for S3/R2 (endpoint, bucket, and public base URL
are already in config) and set `STORAGE_DRIVER=s3`.

## Operations

- **Liveness:** `GET /healthz` · **Readiness:** `GET /readyz` (checks DB) ·
  **Metrics:** `GET /metrics` (Prometheus text).
- **Logs:** structured JSON via pino, with a per-request `x-request-id` and automatic
  redaction of authorization/cookies/secrets.
- **Backups:** for Postgres, schedule `pg_dump`; for the SQLite volume, snapshot the
  `api-data` volume. Persist the `api-uploads` volume (or use S3).

## CI

`.github/workflows/ci.yml` runs on every PR: installs, builds the shared package, generates
the Prisma client, typechecks, runs the shared + API test suites, builds the API, typechecks
and Metro-bundles the mobile app, and builds the API Docker image.

## Restricted networks (Prisma engines)

Prisma downloads native engine binaries on install. Behind a proxy that resets large binary
downloads, install with `npm ci --ignore-scripts`, then fetch the engines for your platform
(e.g. `debian-openssl-3.0.x`) from `binaries.prisma.sh/all_commits/<engineVersion>/<platform>/`
into `node_modules/@prisma/engines/` and run `npx prisma generate`. The engine version is in
`node_modules/@prisma/engines-version/package.json`.
