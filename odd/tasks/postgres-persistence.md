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

- [x] **T1 — DB scaffolding** — `docker-compose.yml` (postgres:16-alpine, host 5434), `.env`/`.env.example`,
  `.gitignore`, `db/migrations/001_schema.sql` (5 tables + 4 indexes), `db/migrations/002_seed_spaces.sql`,
  `db/migrate.js`, `db/sweep-idempotency.js`, `db/seed.js`, `pg` + `@types/pg`, `db:*` scripts.
  Commit `2c9762d`.
- [x] **T2 — Instance up** — container healthy on 5434, 2 migrations applied, 4 spaces + 120 windows
  (30 Lima days each). 9 constraint cases verified in SQL: overlap → 23P01, touching slot → OK,
  cross-day → same-day CHECK, USD → currency CHECK, bad role → role CHECK, cancelled row → no block,
  overlapping windows → 23P01, duplicate idempotency key → 23505. Commit `2c9762d`.
- [x] **T3 — Domain readiness** — `fromPersistence` on `Space`/`Reservation`/`Incident`,
  `createIncidentStateBehavior`, `TimeSlot` on `BUSINESS_TIME_ZONE` (`America/Lima`),
  `findAll` active-only. Commit `bab922f`.
- [x] **T4 — Persistence adapters** — `pg` pool, row mappers, 3 repositories, `IdempotencyStore` port +
  PostgreSQL and in-memory adapters, `createIdempotencyGuard(store)`, env-driven container.
  Commit `2112ede`.
- [x] **T5 — Read surface** — query bus + 7 query handlers, 3 DTO mappers, 7 GET endpoints.
  Commit `a010000`.
- [x] **T6 — Tests** — `tests/e2e/read-api.test.ts` (11, always) and
  `tests/integration/postgres.adapters.test.ts` (11, only with `DATABASE_URL`).
  Commit `b66008b`.
- [x] **T7 — Verification** — `pnpm build` clean; `pnpm test` 152 passed + 11 skipped (hermetic) and
  163 passed with the database; live server smoke on port 3000 against the Docker DB: 20/20 checks,
  a reservation survived a process restart, and the idempotent replay returned the same id
  after the restart. `DATABASE.md` §8/§10 updated with the real seed and the new drift rows.

## Progress

_(updated per task)_

## Notes / decisions taken

- Host port is **5434**: 5432 is the local PostgreSQL service and 5433 was already published by
  another project's container (`pos-system-saas-postgres`).
- The in-memory adapters stay the default when `DATABASE_URL` is absent; `buildContainer({ databaseUrl: '' })`
  pins them explicitly so the Jest suites stay hermetic even with the variable exported.
- The seed owns the reference catalog: it replaces the availability windows of the four reference
  spaces, because `SpaceWriter.save()` rewrites them with fresh surrogate ids and an id-based
  upsert would then violate `windows_no_overlap`. `pnpm db:seed` restores the catalog after drift.
- `DATABASE.md` drift ledger now records the four deltas this implementation exposed
  (window replacement, nullable incident columns, seed example, idempotency port).
