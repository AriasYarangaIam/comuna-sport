# ODD — PostgreSQL persistence for ComunaSport API

## Objective

Make the API serve real, durable data by implementing the target design in `DATABASE.md`
against a dedicated PostgreSQL instance running in Docker (port 5433), without breaking
the existing in-memory path used by the test suite.

## Problem

`DATABASE.md` specifies a PostgreSQL schema and a port→SQL mapping, but the repository has
no schema, no driver, no adapter, and no read endpoints. Every write disappears on restart,
idempotency is process-local, and the API can only create reservations and incidents.

## Why

The user needs real data: seeded spaces, persisted reservations/incidents, correct 409 on
double booking, durable idempotency replay, and read access to what was stored.

## Scope

- Docker Compose PostgreSQL 16 on **5433** (local service on 5432 stays untouched).
- Forward-only SQL migrations + seed, applied by a zero-dependency Node runner.
- Domain rehydration factories (entities are currently create-only).
- PostgreSQL adapters for the 3 repository ports + a DB-backed idempotency store.
- Read endpoints so stored data is observable over HTTP.
- In-memory repositories remain the default when `DATABASE_URL` is absent (tests).

## Non-goals

- No Next.js work: no Next.js project exists on this machine (user confirmed).
- No ORM, no `npx`, no schema builder.
- No auth/users table, no outbox, no payments (v2 per `DATABASE.md` §9).
- No changes to the deployment model: local Docker only.

## Constraints

- `DATABASE.md` is the design authority; `DEVELOPMENT.md` wins where they disagree.
- `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals` are on.
- `pnpm test` must stay green (baseline: 141 tests).
- Business timezone is `America/Lima`, pinned in DDL and in `TimeSlot`.

## Delivery strategy

`ask-on-risk` recorded; slices are delivered as work-unit commits on `comuna/entities`
(not a default branch). No PR is opened without an explicit user request. Forecast is
above 400 authored lines, so the work is split into five reviewable slices.

## Route declaration (per task)

| Task | Route | Trigger evidence |
|---|---|---|
| T1 | delegated (writer) | 7+ non-trivial files, no unresolved design |
| T2 | inline | operational verification only |
| T3 | delegated (writer) | 6 non-trivial files, domain semantics |
| T4 | delegated (writer) | 6+ non-trivial files, port implementations |
| T5 | delegated (writer) | read surface + DTOs, 5+ files |
| T6 | delegated (writer) | test coverage, separate concern from T4/T5 |
| T7 | inline | verification only |

## Tasks

- [ ] **T1 — DB scaffolding**: `docker-compose.yml`, `.env.example`, `.env`, `.gitignore`,
  `db/migrations/001_schema.sql`, `db/migrations/002_seed_spaces.sql`, `db/migrate.ts`,
  `db/sweep-idempotency.ts`, `package.json` (`pg`, `@types/pg`, `db:*` scripts).
- [ ] **T2 — Bring the instance up** on 5433, apply migrations, verify tables and seed rows.
- [ ] **T3 — Domain readiness**: `fromPersistence` on `Space`/`Reservation`/`Incident`,
  incident state-behavior factory, `TimeSlot` Lima-day validation, `findAll` active-only.
- [ ] **T4 — Persistence adapters**: `pg` pool, row mappers, three repositories,
  DB idempotency store, `createIdempotencyGuard(store)`, env-driven container.
- [ ] **T5 — Read surface**: `GET /spaces`, `GET /spaces/:id`, `GET /spaces/availability`,
  `GET /reservations/:id`, `GET /users/:userId/reservations`, `GET /incidents/:id`,
  `GET /spaces/:id/incidents` + DTOs + controllers + routes.
- [ ] **T6 — Tests**: mapper/adapter integration tests gated on `DATABASE_URL`, read-route
  e2e tests on the in-memory container.
- [ ] **T7 — Verification**: `pnpm build` clean, `pnpm test` green, live smoke against the
  Docker database (create → restart → read, 409 overlap, idempotent replay).

## Acceptance criteria

1. `docker compose up -d` + `pnpm db:migrate` produce the 5 tables and 4 seeded spaces.
2. With `DATABASE_URL` set, `POST /spaces/:id/reservations` returns 201 and the row survives
   a process restart.
3. A second overlapping reservation returns 409 (DB `EXCLUDE`, not app-level check).
4. Replaying the same `Idempotency-Key` returns the stored 201; a different payload returns 422.
5. `GET` endpoints return the seeded spaces and the created rows.
6. `pnpm test` passes with the baseline suite intact; `pnpm build` emits no errors.

## Checks

- `pnpm test`
- `pnpm build`
- `docker compose up -d && pnpm db:migrate`
- live smoke against `http://localhost:3000`

## Progress

_(updated per task)_
