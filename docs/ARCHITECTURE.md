# Architecture

Umuturanyi is a TypeScript monorepo with three workspaces and one source of truth for
domain logic.

```
┌──────────────────────┐        HTTPS / WSS         ┌───────────────────────────┐
│  apps/mobile (Expo)  │ ─────────────────────────► │   apps/api (Express)      │
│  iOS · Android · web │   REST  +  Socket.IO        │  REST · realtime gateway  │
└──────────┬───────────┘                            └────────────┬──────────────┘
           │                                                      │
           │            ┌──────────────────────────┐             │
           └──────────► │  packages/shared          │ ◄───────────┘
                        │  types · zod · trust · …  │
                        └──────────────────────────┘
                                      │ Prisma
                                      ▼
                          SQLite (dev) / PostgreSQL (prod)
```

## Why a shared package

`packages/shared` holds everything both ends must agree on:

- **Taxonomy & geography** — categories, community topics, Rwandan neighborhoods (with
  coordinates and a Haversine `distanceKm`).
- **Enums** — listing/report/notification statuses, stored as strings so the schema is
  portable across SQLite and Postgres.
- **The Agaciro trust model** (`trust.ts`) — a pure, explainable function. The API computes
  the authoritative score; the mobile app uses the same function to render the "why".
- **Zod schemas** — the request/response contract. The API validates inbound data with them;
  the app derives form types from them. One definition, no drift.

## Backend layering (`apps/api`)

```
HTTP request
   │
   ▼
middleware ── helmet · cors · pino-http(request id) · rate limit · attachUser(JWT)
   │
   ▼
controller (modules/<feature>/*.controller.ts)
   │   route + validate(zodSchema) + auth/role gate
   ▼
service (modules/<feature>/*.service.ts)
   │   business rules + data access (Prisma) + emits domain events
   ▼
mapper (mappers/) ── Prisma row → wire DTO (never leak internal columns)
   │
   ▼
JSON envelope        errors → AppError → consistent { error: { code, message } }
```

- **Controllers** are thin: parse/validate input, enforce auth, delegate, shape the response.
- **Services** own the logic and are the data-access boundary (the repository, expressed
  through Prisma). They are independently testable and emit domain events rather than
  reaching into other features.
- **Mappers** guarantee internal fields (password hashes, soft-delete flags) never reach the
  wire.

### Cross-cutting libraries (`src/lib`)

| Module | Responsibility |
|--------|----------------|
| `prisma.ts` | Single PrismaClient (reused across dev hot-reloads) |
| `tokens.ts` | JWT access tokens + opaque, hashed-at-rest refresh tokens |
| `password.ts` | bcrypt hashing for passwords and short-lived secrets |
| `cursor.ts` | Opaque keyset-pagination cursors |
| `storage.ts` | Pluggable file storage (local disk now, S3-ready interface) |
| `cache.ts` | TTL cache (in-memory; Redis-swappable interface) |
| `events.ts` | Typed in-process domain-event bus |
| `errors.ts` | `AppError` taxonomy → HTTP status + stable error codes |

## Domain events

Producers state facts; subscribers react. A favorite, like, comment, follow, or review emits
an event (`lib/events.ts`); `modules/notifications/subscribers.ts` turns those into
notifications and reputation recomputes — without the producer knowing. This keeps modules
decoupled and gives a clean seam to later forward events to a queue/worker for horizontal
scaling.

## Realtime

`realtime/socket.ts` authenticates every socket from its handshake JWT, joins a per-user
room (`user:<id>`) and per-conversation rooms, and tracks presence by counting live
connections. Services emit through `realtime/registry.ts`, a thin indirection that safely
no-ops when realtime isn't attached (unit tests, worker processes). Messaging delivers
`message:new`, `typing`, and `message:read` events; notifications push `notification:new`.

## Trust — Agaciro

A 0–100 score from inputs a neighbor can understand: phone/email verification, average
rating (confidence-weighted by count), completed sales (diminishing), response rate, account
age, minus upheld reports. It is recomputed on the events that change its inputs and cached
on the user row for cheap reads. Tiers: _Mushya → Aritera imbere → Yizewe → Inkingi
y'umudugudu_.

## Security posture

- JWT **access** tokens (short-lived) + **rotating refresh** tokens (opaque, stored only as a
  bcrypt hash; reuse of a rotated token is rejected).
- **RBAC** (`member`/`moderator`/`admin`) with suspension and role changes enforced on the
  next request via a short-cached live-user check.
- **Validation** at every edge (Zod), **rate limiting** (global + strict auth + write tiers),
  **Helmet** secure headers, **CORS** allow-list, parameterized queries via Prisma, **soft
  deletes**, and **audit logging** of moderator actions.

See [DATABASE.md](DATABASE.md) for the data model and [DEPLOYMENT.md](DEPLOYMENT.md) for the
production topology.
