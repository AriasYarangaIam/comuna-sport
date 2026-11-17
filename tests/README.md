# Tests

Jest suites for the API, run from the repository root with `pnpm test`:

| Directory | Contents |
|---|---|
| `unit/` | Value objects, cost strategies, state machine, entities, container wiring, shutdown, CORS resolver |
| `integration/` | Handlers with real in-memory wiring, LocalEventBus, idempotency middleware, PostgreSQL adapters |
| `e2e/` | supertest against the production app built with `createApp(buildContainer())` — no port is opened |

Conventions:

- Tests build the app via `createApp(buildContainer())` (exported from `src/main.ts`);
  `bootstrap()` sits behind `require.main === module`, so nothing listens on a port.
- The PostgreSQL suites are hermetic: they skip themselves with a visible
  `[postgres] SKIPPED — DATABASE_URL is not set.` message unless `DATABASE_URL`
  points at a migrated database (Docker: `pnpm db:up && pnpm db:migrate`).
- No `as any`; typed event listeners; no server process is left running.

The SPA has its own suites under `apps/web` (Vitest + Testing Library, Playwright
for E2E and axe accessibility) — see `apps/web/README.md`.
