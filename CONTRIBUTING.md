# Contributing

Thanks for helping build Umuturanyi 🧺.

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate -w @umuturanyi/api
npm run db:seed
npm run dev:api      # terminal 1
npm run mobile       # terminal 2
```

## Conventions

- **TypeScript everywhere**, strict mode. No `any` escape hatches without a reason.
- **Backend feature modules** live in `apps/api/src/modules/<feature>/` as a
  `*.service.ts` (logic + data access) and `*.controller.ts` (routes). Keep controllers thin;
  validate input with a Zod schema from `@umuturanyi/shared`; map rows to DTOs in `mappers/`.
- **Shared contracts** (types, zod schemas, enums, domain logic) belong in
  `packages/shared` — never duplicate them per app.
- **Self-documenting code** over comments; add a comment only to explain *why*, not *what*.
- Prefer **small, dependency-light** additions.

## Before opening a PR

```bash
npm run typecheck          # all workspaces
npm run test               # shared + api suites
npm run typecheck -w @umuturanyi/mobile
```

Add tests for new backend behavior (Vitest + Supertest in `apps/api/tests`). CI runs the
same checks plus a Metro bundle of the mobile app and a Docker image build.

## Commits

Write clear, imperative commit messages that explain the change and its motivation.
Keep unrelated changes in separate commits.
