<div align="center">

# 🧺 Umuturanyi

**A neighborhood marketplace & community platform for Rwanda.**
_Umuturanyi — “neighbor” in Kinyarwanda. Ku baturanyi, n’abaturanyi._

Buy & sell nearby · build community · save together (Ibimina) · look out for one another.
An original, production-shaped implementation inspired by the engineering and UX of
neighborhood marketplaces like Karrot — **no third-party code, assets, or branding**.

</div>

---

## What this is

A full-stack, mobile-first product:

- **`apps/api`** — a TypeScript REST + realtime backend (Express, Prisma, Socket.IO).
- **`apps/mobile`** — a React Native (Expo) app targeting **iOS, Android, and web** from one codebase.
- **`packages/shared`** — domain logic shared by both (taxonomy, locations, the _Agaciro_ trust model, and the Zod request/response contracts).
- **`design/`** — the original design canvas the product was built from.

Everything speaks **Kinyarwanda first**, prices in **Rwandan Francs (Frw)**, and is built around
mobile-money (MTN MoMo / Airtel Money) habits.

### Core features

| Area | Highlights |
|------|-----------|
| 🛒 Marketplace (Isoko) | Listings with images, categories, conditions; filter, sort, keyset pagination, **distance ("nearby") ranking** |
| 👥 Community (Umuryango) | Neighborhood feed: posts, comments, replies, likes, topics |
| 💬 Messaging (Ubutumwa) | Realtime chat — presence, typing, read receipts, unread counters |
| 🤝 Trust (Agaciro) | Transparent, explainable 0–100 reputation score with a "why" breakdown |
| 💰 Umuturanyi Pay | Wallet + simulated MoMo rail; **Ibimina** savings circles |
| 🔔 Notifications | Realtime + inbox, driven by a decoupled domain-event bus |
| 🔍 Search | Full-text-ish search, autocomplete, popular & recent searches |
| 🛡️ Moderation | Reports, takedowns, user management, audit logs, admin dashboard, RBAC |

---

## Quickstart

> Requirements: **Node 20+** and npm. No database server needed — dev uses SQLite.

```bash
# 1. Install
npm install
cp .env.example .env            # tweak if you like; defaults work for local dev

# 2. Set up the database (SQLite) and seed realistic demo data
npm run db:migrate -w @umuturanyi/api    # apply migrations
npm run db:seed                          # users, listings, posts, an ibimina…

# 3. Run the API  (http://localhost:4000)
npm run dev:api

# 4. In another terminal, run the mobile app (Expo)
npm run mobile                  # press i / a / w for iOS, Android, or web
```

**Demo logins** (password `umuturanyi123`): `+250788100001` (Aline, Kimironko),
`+250788100002` (Bosco), … and admin `+250788000000`.

Health check: `curl http://localhost:4000/healthz` · API root: `http://localhost:4000/api/v1`.

---

## Verified, not just scaffolded

```
✓ packages/shared   7 unit tests  (trust score, formatting, geo)
✓ apps/api         27 integration tests  (auth, listings, favorites,
                      community, messaging, reviews/trust, admin, wallet)
✓ apps/mobile      typechecks + bundles to Hermes bytecode via Metro
```

Run it all yourself:

```bash
npm run test            # shared + api test suites
npm run typecheck       # every workspace
```

---

## Project structure

```
.
├── apps/
│   ├── api/                 # Express + Prisma + Socket.IO backend
│   │   ├── prisma/          # schema, migrations, seed
│   │   └── src/
│   │       ├── config/      # validated env
│   │       ├── lib/         # prisma, tokens, storage, cache, events, errors…
│   │       ├── middleware/  # auth (RBAC), validation, rate limiting, errors
│   │       ├── modules/     # feature modules (service + controller per feature)
│   │       ├── realtime/    # Socket.IO gateway + registry
│   │       └── mappers/     # row → wire DTO
│   └── mobile/              # Expo Router app (iOS / Android / web)
│       ├── app/             # file-based routes (auth, tabs, detail, chat…)
│       └── src/             # theme, components, api client, stores, hooks
├── packages/shared/         # cross-cutting domain types, schemas & logic
├── design/                  # original design canvas (preserved)
├── docs/                    # architecture, API, database, deployment, mobile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — layering, request lifecycle, realtime, events
- [API reference](docs/API.md) — every endpoint
- [Database](docs/DATABASE.md) — the data model
- [Deployment](docs/DEPLOYMENT.md) — Docker, Postgres switch, secrets, scaling
- [Mobile](docs/MOBILE.md) — running on devices & building iOS/Android with EAS
- [Contributing](CONTRIBUTING.md)

---

## Tech & principles

**Backend:** TypeScript · Express · Prisma (SQLite dev / PostgreSQL prod) · Socket.IO ·
Zod · JWT (access + rotating refresh) · bcrypt · Helmet · pino · Vitest + Supertest.

**Mobile:** TypeScript · Expo · React Native · Expo Router · React Query · Zustand · Socket.IO client.

Clean modular architecture, a thin service layer per feature, dependency-light libraries,
strict typing, soft deletes, audit logging, and security by default (RBAC, rate limiting,
input validation, hashed secrets, secure headers). See [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Intellectual property

This is an **original implementation**. It studies the _observable behavior_ of community
marketplaces for inspiration but contains no copied source, APIs, copyrighted text, logos,
icons, images, or trademarks. The brand “Umuturanyi”, the palette, the wordmark, and all
copy here are original.

## License

MIT — see [LICENSE](LICENSE).
