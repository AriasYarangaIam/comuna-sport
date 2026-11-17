# ComunaSport

Digital platform for booking municipal sports spaces and reporting damage to the
infrastructure, built as a learning-grade reference implementation of a hexagonal
(ports & adapters) architecture.

- **API** — Node.js + Express 5 + TypeScript, hexagonal layers, PostgreSQL (or
  in-memory adapters when no database is configured).
- **Web** — React 19 + Vite SPA (`apps/web`), Spanish (Peru) UI, mobile-first.
- **Promises** — *zero favoritism* (every price is explained on screen: base cost,
  role factor, total) and *citizen auditing* (every reported incident is traceable
  through its lifecycle).

Status: implemented, tested, and deployed — see [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Repository layout

| Path | Contents |
|---|---|
| `src/domain/` | Value objects, entities, domain events, exceptions, repository ports |
| `src/application/` | Commands, queries, handlers, DTOs, ports (Reader/Writer) |
| `src/infrastructure/` | HTTP routes/controllers/middleware, DI container, persistence adapters (in-memory + PostgreSQL) |
| `src/main.ts` | Composition root; exports `createApp` so tests build the app without listening |
| `api/index.ts` | Vercel entry point (re-exports the app) |
| `db/` | Migrations (`001`–`003`), seed, migrate, and idempotency-sweep runners |
| `apps/web/` | The SPA (React 19 + Vite + Tailwind) with its own tests |
| `tests/` | Jest suites: `unit/`, `integration/`, `e2e/` (supertest) |
| `odd/tasks/` | Feature documents: specs, tasks, and evidence log per effort |

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node ≥ 22.13, pnpm, CommonJS, TypeScript 6.0.3 (single compiler) |
| HTTP | Express ^5.2.1 — helmet, cors, express-rate-limit, Zod validation at controllers |
| Database | PostgreSQL 16 (Docker locally, Neon in production), plain SQL migrations, no ORM |
| API tests | Jest ^30 + supertest (in-process; no port is opened) |
| Web | React 19, Vite, Tailwind 3.4, TanStack Query, Zustand, React Router 7 |
| Web tests | Vitest + Testing Library; Playwright for E2E/a11y |

## Quick start (API)

```bash
pnpm install

# Option A — no database: in-memory adapters are used automatically.
pnpm dev                       # http://localhost:3000

# Option B — PostgreSQL:
cp .env.example .env           # DATABASE_URL=postgres://…:5434/comuna_sport
pnpm db:up                     # Docker container on host port 5434
pnpm db:migrate                # applies db/migrations/001–003
pnpm db:seed                   # 4 spaces + 30 days of availability windows
pnpm dev
```

Without `DATABASE_URL` the container binds the in-memory repositories, which is
also what keeps the test suite hermetic.

## Testing

```bash
pnpm test          # Jest: unit + integration + supertest e2e
pnpm typecheck     # tsc for the app and for api/index.ts (tsconfig.api.json)
pnpm build         # tsc → dist/

cd apps/web
pnpm test:run      # Vitest (49 tests)
pnpm e2e           # Playwright (flows + axe accessibility, needs `pnpm e2e:install`)
```

PostgreSQL-backed integration suites skip themselves unless `DATABASE_URL` is
set; every other suite runs offline.

## API surface

| Method & path | Purpose |
|---|---|
| `GET /spaces` | Seeded space catalog |
| `GET /spaces/:slug` | One space |
| `GET /spaces/availability?start&end` | Spaces free for the slot (30-day horizon) |
| `POST /spaces/:slug/reservations` | Create a reservation — requires `Idempotency-Key` and `dni` (`^\d{8}$`) |
| `GET /reservations/:id` | Reservation detail |
| `GET /users/:dni/reservations` | Reservations of a citizen (8-digit DNI, validated) |
| `POST /incidents` | Report damage |
| `GET /incidents/:id` · `GET /spaces/:slug/incidents` | Incident detail / list |
| `GET /internal/idempotency/sweep` | Cron-only sweep (404 unless `CRON_SECRET` is set) |

Spaces are addressed by their public `slug` (never by UUID), and the DNI is accepted as input only — no response ever echoes it. Errors always use the `{ "error": { "code", "message" } }` shape. Reservation
creation honours the `Idempotency-Key` contract: `400` missing key, `409`
in-flight duplicate, `422` payload mismatch, replay of a completed request
returns the original `201`. Timezone rule: slots are America/Lima wall clock.

## Deployment

Three pieces, all live: the SPA and the API on Vercel, PostgreSQL on Neon.
Configuration, environment variables, and operational notes are documented in
[`DEPLOYMENT.md`](DEPLOYMENT.md).

## Documentation index

| Document | Audience |
|---|---|
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Source of truth for architecture, conventions, and API principles |
| [`DESIGN.md`](DESIGN.md) | UI/UX specification, design system, screens S1–S7 (Spanish) |
| [`DATABASE.md`](DATABASE.md) | PostgreSQL schema, drift ledger, migration policy |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Live topology, env vars, redeploy procedure |
| [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) | Web implementation plan, QA evidence, bundle audit |
| [`tests/README.md`](tests/README.md) | Test-suite conventions |
| [`apps/web/README.md`](apps/web/README.md) | SPA-specific notes |
| [`odd/tasks/`](odd/tasks/) | Per-feature spec/task/log documents with verification evidence |
| [`PRE-DESIGN.md`](PRE-DESIGN.md) | Historical design input (superseded by `DESIGN.md`) |

## License

ISC.
