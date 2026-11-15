# Deploy hardening

Close the deployment items `DEPLOYMENT.md` deferred "when the project leaves the demo stage":
configuration-driven CORS, a TypeScript check that covers the Vercel entry point, a scheduled
idempotency sweep, and a graceful shutdown that releases the PostgreSQL pool.

## Specs

S1 — CORS is restricted by configuration, not by code edit.
The API reads `CORS_ALLOWED_ORIGINS`, a comma-separated list of absolute origins
(`https://web-rust-iota-ncqbfyebew.vercel.app`). When the variable is absent or blank the API keeps
today's open behaviour, because `DEPLOYMENT.md` documents that as the demo default: "CORS is open
(`cors()` defaults) because the SPA and the API are different origins. Restrict it to the Vercel
domain when the project leaves the demo stage." A malformed entry fails at boot instead of silently
falling back to open CORS.

S2 — The Vercel entry point is type-checked.
`DEPLOYMENT.md`: "`api/index.ts` is bundled by Vercel's esbuild and is **not** covered by `tsc`".
It must be covered by a runnable check that fails on a type error.

S3 — The idempotency sweep can run on a schedule.
`pnpm db:sweep` clears expired rows today, but `DEPLOYMENT.md` states "Idempotency is durable in
PostgreSQL with a 24 h TTL; `pnpm db:sweep` clears expired rows" and nothing runs it. The API exposes
`GET /internal/idempotency/sweep`; Vercel invokes it daily with `Authorization: Bearer $CRON_SECRET`,
which the endpoint verifies with a constant-time comparison and answers `200 {"swept": <n>}`. With
`CRON_SECRET` unset the route answers `404` (not routable), so an unconfigured deployment exposes
nothing. The sweep is a port operation, so the in-memory adapter prunes its own map with the same TTL.

S4 — Shutdown releases the pool.
On `SIGTERM` or `SIGINT` the process stops accepting connections and closes the PostgreSQL pool; a
process with no pool (in-memory adapter) exits without error.

S5 — Configuration is documented.
`.env.example` and `DEPLOYMENT.md` name every new variable and what happens when it is unset.

## Tasks

| ID | Spec | Route | Outcome / commit |
| --- | --- | --- | --- |
| T1 | S1 | inline | CORS resolver + wiring + 9 tests — PR 2 (`feat(api): resolve the CORS allowlist…`) |
| T2 | S2 | inline | `tsconfig.api.json` + `typecheck`/`typecheck:api` — PR 1 (`build(api): type-check the vercel entry point`) |
| T3 | S3 | inline | `sweepExpired` port + both adapters + cron route + `vercel.json` + 6 tests — PR 3 |
| T4 | S4 | inline | `Container.close()` + `createShutdownHandler` + signals + 7 tests — PR 4 |
| T5 | S5 | inline | `DEPLOYMENT.md` + `.env.example` (placeholder comments, no real values) — PR 5 |

Evidence: `pnpm test` 193 passed / 19 skipped (was 171/19), `pnpm build` clean, `pnpm typecheck`
clean for both projects. T2 was proven by planting `const probe: number = "not a number"` in
`api/index.ts` (TS2322 reported) and reverting it. The PostgreSQL sweep SQL is covered by a new
case in `tests/integration/postgres.adapters.test.ts`, but it did not run here: the Docker daemon is
not available and production Neon was not mutated.

Delivery: chained PRs, accepted in order (maintainer decision, L5). Commits were re-sliced so no PR
carries a shared-file hunk from another concern, and each slice is independently buildable:

| PR | Slice | Lines | Merged as |
| --- | --- | --- | --- |
| #8 | build: type-check the Vercel entry point (S2) | 13 | `b660b68` |
| #9 | CORS allowlist (S1) | 162 | `6157757` |
| #10 | scheduled sweep (S3) | 260 | `d3ede89` |
| #11 | graceful shutdown (S4) | 205 | `be6a1b8` |
| #12 | documentation (S5) | ~150 | this PR |

One correction during delivery: the first attempt put the CORS wiring in the sweep slice, which left
PR 2 with tests the code could not pass. The wiring belongs with the slice that is observed by those
tests, so the commits were re-cut before merging.

Out of scope (needs a product decision, not hardening): a shared rate-limit store for serverless
instances. The per-instance counter stays documented in `DEPLOYMENT.md`.

## Log

L1 (user, verbatim): "Si, prosigue con ese punto de la lista" — approving item 2 of the completion
report: "Restringir CORS al dominio Vercel (hoy está abierto con los defaults de `cors()`).
Type-check de `api/index.ts` — Vercel lo empaqueta con esbuild y `tsc` no lo cubre. Rate-limit
store compartido … Limpieza automática de idempotency — `pnpm db:sweep` existe pero no tiene
cron/programación … Handler de SIGTERM / cierre del pool en producción — `closePool` solo se usa en
tests."

L2 (decision): the shared rate-limit store is deferred — it needs a vendor or a per-request database
round trip, which is a product decision; every other item in the approved list is implemented here.

L3 (context): the working tree already carried the uncommitted frontend QA slice from
`FRONTEND_PLAN.md` §10 (contrast fix + `e2e/a11y.spec.ts`). Those files are unrelated and stay
uncommitted; the commits below stage only this feature's files.

L4 (blocker, resolved): writing `.env.example` is refused by the file tools' safety policy
(sensitive path). The maintainer authorized the addition under one condition — placeholders only,
never our real values, and no real secret in any committed file. The append went through the shell
and contains `https://your-spa.example` plus an empty `CRON_SECRET=`.

L5 (maintainer): shared rate-limit store stays out — "Dejarlo documentado (sin cambios)"; the
per-instance counter is described in `DEPLOYMENT.md`. Delivery strategy: chained PRs merged in
order.
