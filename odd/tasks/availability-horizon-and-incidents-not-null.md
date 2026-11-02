# ODD — Availability horizon alignment & incidents NOT NULL

Two defects surfaced while verifying the local-database configuration against `DATABASE.md`:
the seeded catalog was anchored on the database server's **UTC** date instead of the
**America/Lima** business day, and the in-memory adapter exposed a **1-day** horizon instead
of the catalog's 30 days. Both adapters of `SpaceReader.findByAvailability` therefore
answered differently for the same slot. The third item closes `DATABASE.md` §10 drift row 6
by making `incidents.reporter_id`, `incidents.description` and `incidents.state` `NOT NULL`.

## Specs

**S1 — The seeded catalog is anchored on the America/Lima business day.**

- Verbatim (`DATABASE.md` §3): "Timezone | `America/Lima` — the single pinned business timezone (Peru deployment; confirmed, not adjustable)"
- Verbatim (`DATABASE.md` §8): "Windows are generated for today + the next 29 days, one row per space per day, as Lima wall-clock times converted to `timestamptz`."
- Observable: a slot on the **current America/Lima business day** is covered by the seeded catalog.

**S2 — The in-memory adapter exposes the same 30-day horizon as the catalog.**

- Verbatim (`tests/integration/postgres.adapters.test.ts`): "The seeded catalog carries one window per space per day for the next 30 days, so a random window gives every run its own slot and parallel runs cannot collide."
- Observable: a slot on the current America/Lima day, on **+1 day** and on **+29 days** matches a seeded space; a slot on **+30 days** matches none.

**S3 — The two adapters of `SpaceReader.findByAvailability` agree.**

- Verbatim (`DATABASE.md` §2): "A future PostgreSQL adapter implements the same 6 interfaces; the composition root rebinds ports to adapters; the domain and application layers stay untouched."
- Observable: for the same slot, the in-memory adapter and the PostgreSQL adapter return the **same space ids**.

**S4 — `incidents` rejects a row without a state, a reporter or a description.**

- Verbatim (`DATABASE.md` §10, row 6): "`incidents.reporter_id` / `description` / `state` are nullable in the §5 DDL, but the domain requires them"
- Verbatim (`DATABASE.md` §10, row 6): "Tightening to `NOT NULL` is the recommended follow-up."
- Observable: inserting an incident with a NULL `state`, `reporter_id` or `description` raises SQLSTATE **23502** (`not_null_violation`).

**S5 — The tightening ships as a forward-only migration.**

- Verbatim (`DATABASE.md` §8): "Plain numbered forward-only SQL files: `db/migrations/NNN_description.sql`."
- Observable: `db/migrations/003_tighten_incidents.sql` is a **new** file; `001_schema.sql` is not rewritten.

**S6 — The drift ledger and the target DDL reflect the change.**

- Verbatim (`DATABASE.md` §10, row 6): "NOT TIGHTENED — the DDL is kept verbatim; the PostgreSQL adapter rejects a row without a state and the only writer always sets all three."
- Observable: `DATABASE.md` §5 shows the tightened `incidents` DDL, §8 documents the America/Lima anchor and the bootstrap sequence, and §10 row 6 is closed with its anchor.

## Tasks

| ID | Specs | Task | Route | Commit |
|----|-------|------|-------|--------|
| T1 | S1–S4 | RED tests: hermetic 30-day horizon + DB-gated `incidents` NOT NULL + Lima seed anchor probe | inline | `7e04053` (horizon) · `58d497d` (catalog) · `eaec604` (constraints) |
| T2 | S1 | Seed anchor: `db/migrations/002_seed_spaces.sql` derives its 30-day range from `(now() AT TIME ZONE 'America/Lima')::date` | inline | `58d497d` |
| T3 | S2, S3 | In-memory horizon: `space.in-memory.repository.ts` materialises one window per space per day for 30 business days from the current America/Lima day | delegated (`gentle-ai-worker`) | `7e04053` |
| T4 | S4, S5 | `db/migrations/003_tighten_incidents.sql`: idempotent `SET NOT NULL` with a NULL-row pre-check | delegated (`gentle-ai-worker`) | `eaec604` |
| T5 | S6 | `DATABASE.md` §5 (tightened DDL), §8 (Lima anchor + bootstrap sequence), §10 (drift row 6 closed) | inline | not committed — see Log L7 |
| T6 | S1–S6 | Verification: `pnpm build`, hermetic suite, `DATABASE_URL` suite, differential probe in-memory vs PostgreSQL, independent verify | inline + `gentle-ai-verify` | — |
| T7 | S1–S6 | Work-unit commits on `comuna/entities` (no push, no PR) | inline | `7e04053` · `58d497d` · `eaec604` |

### Delivery strategy — slice boundary

Baseline commit for this feature: `54a6713f3e206108795a5f3469db0b528e33ca57`. The
feature ships as three work-unit commits, each inside the ~400 authored-line budget:

| Commit | Scope | Authored lines |
|--------|-------|----------------|
| `7e04053` | in-memory 30-day horizon + its hermetic suite | 312 |
| `58d497d` | Lima seed anchor + catalog anchor/parity suite | 241 |
| `eaec604` | incidents NOT NULL migration + its constraint suite (Risk item 1 — own commit) | 161 |

### Routing decision

Inline (no writer delegation), with evidence:

- **The Writer rule trigger does not fire.** Each unit is a change to one module plus one SQL
  file; after folding in its own tests and docs neither unit clears "heavier than a subagent
  start" on its own.
- **Parallel writers would collide on the shared database.** Both units' DB-gated suites hit
  the same PostgreSQL instance, and `postgres.adapters.test.ts` truncates `reservations`,
  `incidents` and `idempotency_keys` in `afterEach` — concurrent runs would clobber each
  other's rows.
- **`DATABASE.md` is a shared edit surface** (§8 for the seed, §5/§10 for the incidents), so
  the units are not disjoint.

## Progress

- **T1 — RED observed.** Hermetic suite: `Tests: 4 failed, 6 passed, 10 total` — the four
  horizon tests failed against the single-day catalog while the six behaviour-preserving
  tests passed. DB-gated suite: `Tests: 8 failed, 8 total` — the NULL inserts succeeded
  instead of raising 23502, the live schema reported `is_nullable = 'YES'`, the seed did
  not derive its range from `now()`, the live catalog covered 0 rows on the current Lima
  business day, and the two adapters did not overlap.
- **T2 — Seed anchored** on `(now() AT TIME ZONE 'America/Lima')::date`.
- **T3 — In-memory catalog**: 30 windows per space, one per business day from the current
  Lima day through +29. `pnpm test tests/integration/in-memory.adapters.test.ts` →
  `Tests: 10 passed, 10 total`.
- **T4 — Migration applied.** `pnpm db:migrate` → `applied 003_tighten_incidents.sql`; the
  second run → `migrations complete: 0 applied, 3 already applied, 3 total`. Live schema:
  `reporter_id`, `description` and `state` all `is_nullable = 'NO'`; `resolved_at` stays
  nullable.
- **T5 — Documentation** updated in `DATABASE.md` §5, §8 and §10.
- **T6 — Verification.**
  - `pnpm build` → clean.
  - `pnpm test` (hermetic) → `Tests: 162 passed, 19 skipped, 181 total`.
  - `DATABASE_URL=… pnpm test` → `Test Suites: 13 passed, 13 total` / `Tests: 181 passed,
    181 total`.
  - Differential probe (in-memory vs PostgreSQL, same slot through HTTP): 12/12 checks
    passed, including **window instants identical for all 4 seeded spaces** (0 mismatches)
    — the two adapters now materialise byte-identical windows, not merely equivalent
    behaviour. The catalog opens on `2026-10-21` (the current Lima business day) and
    covers 30 consecutive business days.
  - Adversarial probe of the migration (the risk item): the shipped
    `003_tighten_incidents.sql` was executed against a table whose `state` column had
    been made nullable again and seeded with one offending row. It **refused** —
    `003_tighten_incidents: refusing to SET NOT NULL — incidents holds 1 row(s) with NULL
    in reporter_id, description or state; repair those rows and re-run` — the offending
    row survived, the column stayed nullable (no partial application), and re-running
    the file on a clean table succeeded twice in a row (idempotent). The probe row was
    deleted and the shipped file re-applied, leaving the live schema exactly as
    committed: `is_nullable = 'NO'` on all three columns and 0 rows.
  - **Independent verification: unavailable in this environment.** `gentle-ai-verify`
    (three attempts, including a one-field health diagnostic), `review-risk` and
    `jd-judge-a` all fail with the same opaque error, and the native review relay
    refuses to launch any lens with `no model is configured for review-risk; assign it a
    model in the agent model routing config`. The parent ran the spec-derived probes
    above instead; a separate reviewer session could not be obtained.
- **T7 — Work-unit commits** `7e04053`, `58d497d`, `eaec604` on `comuna/entities`. No
  push, no PR — both remain the user's decision.

## Log

**L1** — `Si, resuelve esas 3 cosas, tienes autorización`

The three authorized items, quoted from the orchestrator's recommendation the user accepted:

1. "anclar la semilla en `America/Lima` — `(now() AT TIME ZONE 'America/Lima')::date`"
2. "alinear el horizonte del adaptador en memoria"
3. "cerrar el drift #6 con `NOT NULL`"

**L2** — Evidence (measured 2026-10-21 22:18 America/Lima, UTC 2026-10-22 03:18):
`GET /spaces/availability` for a 13:00 Lima slot returned **4** spaces on the in-memory adapter
and **0** on the PostgreSQL adapter. The seeded catalog's first window started
`2026-10-22 11:00 UTC` = `2026-10-22 06:00 America/Lima`, so the current Lima business day
had **no** window — the seed's `current_date` evaluates in the container's UTC clock.

**L3** — Decision: the seed file is edited in place (it is a re-runnable catalog, applied
outside `schema_migrations` by `pnpm db:seed`), while the `incidents` tightening ships as a
**new** forward-only migration — `001_schema.sql` was already applied and stays untouched.

**L4** — Decision: the in-memory adapter keeps its Lima helper private to
`space.in-memory.repository.ts`; the domain is not touched, so `TimeSlot` and the entity
invariants keep their current blast radius.

**L5** — Decision: `rows.ts` keeps its runtime guard for a missing `state`. The `NOT NULL`
constraint now rejects the row first (SQLSTATE 23502); the guard stays as defence in depth.

**L6** — Delivery: three work-unit commits (`7e04053`, `58d497d`, `eaec604`) on
`comuna/entities`, each inside the ~400 authored-line budget. The migration carries
`Risk: item 1` and therefore ships as its own commit so the review can take it alone.

**L7** — `DATABASE.md` and `DEVELOPMENT.md` are **untracked by maintainer directive**
(`.gitignore`: "Authoritative guides — deliberately untracked per maintainer directive
(read-only aids)"). The T5 documentation edit therefore lives in the working tree and is
not part of any commit; it is not lost, it is simply outside version control by that
directive.

**L8** — The in-memory adapter keeps generating random space ids (`Space.create`), while
the PostgreSQL seed pins fixed UUIDs. Both adapters therefore answer the same
availability question with the same spaces but different ids. This is a pre-existing
divergence, not part of the three authorized items, and it was left untouched: the id is
opaque to every consumer, and the UI reads whatever id the API returns.

**L9** — Native review: the lifecycle was entered (`inspect` → `start` → `status`, lineage
`review-7a8266215bf7fffb`, tier `medium`, lenses `review-risk` + `review-readability` +
`review-reliability`, 8 changed files, 883 changed lines) and the collect slots were
issued, but **no reviewer could be launched**: the Pi host relay fails with
`no model is configured for review-risk; assign it a model in the agent model routing
config`, both for the whole group and for a single slot. The lineage is left in state
`reviewing` with its three collect slots outstanding — nothing was submitted, so no
authority was burned and no verdict was recorded. Releasing it needs an explicit
operator decision.
