# Feature: API implementation completion (DEVELOPMENT.md tasks)

## Objective
Finish all remaining DEVELOPMENT.md implementation tasks (T1–T21), excluding the
database (separate effort, tracked in DATABASE.md). Verify which tasks are already
complete, audit their conformance, and implement the rest.

## Problem
The guide is the authoritative target-state blueprint (21 tasks, ~2,325 lines).
By inspection, domain-layer files exist but the application remainder
(DTOs, handlers, CommandBus), the entire infrastructure layer, all tests, and the
D1-compliant tooling config are missing.

## Scope
- 21 tasks from DEVELOPMENT.md §14 (Phases 1–6).
- D1/D2 config corrections (package.json, tsconfig.json, jest.config.ts).
- Tests (unit, integration, e2e).
- OUT OF SCOPE: database implementation (DATABASE.md, separate change); the 7
  existing unconforming stubs remain untouched (G11) except where superseded by
  completed implementation per the guide.

## Constraints
- Full CJS (D1), TS 6.0.3 single compiler (Known Issue 2), registry factory (D2),
  Reader/Writer ports (D3), Idempotency-Key middleware (D4).
- PEN currency default; ReservationId camelCase; branded IDs; no `any`;
  explicit return types; discriminated-union events; APIError error shape.

## Authorized scope
Implementation per DEVELOPMENT.md §14. Config corrections are authorized by
Known Issues items 1–2 (D1). Stubs under src/ that the guide supersedes are
replaced by completing tasks; src/dev.ts stays untouched.

## Checklist
- [x] T0 Audit existing domain/application files against guide invariants + D1 tooling audit (glob + code inspection)
- [x] T0a Fix tooling config (D1): package.json `type: commonjs`, scripts (dev/build/start/test/test:watch/test:cov), deps (helmet, cors, express-rate-limit, zod, typescript ^6.0.3), tsconfig per guide §13, jest.config.ts per guide §13; pnpm install; `pnpm test` runs green (no tests yet)
- [x] T1 Value Objects — EXISTS; audit 6 VOs: full invariants, branded IDs, freeze, explicit return types, PEN default; fix where short
- [x] T2 Domain Exceptions — EXISTS; audit UPPER_SNAKE codes + instanceof
- [x] T3 Repository ports (Reader/Writer D3) — EXISTS; audit 6 interfaces / correct shape; fix where short
- [x] T4 Event interfaces — EXISTS; audit discriminated union, no `as`, no magic strings
- [x] T5 Cost strategies + registry factory — EXISTS; audit Map+register, no switch, correctness (Senior 100→50, Private 50.50→60.60, rounding)
- [x] T6 Incident state machine — EXISTS; audit transition matrix (Rejected/Resolved terminal, throws InvalidStateTransitionException)
- [x] T7 Space entity — EXISTS; audit invariants (name 1–200, capacity>0, isSlotWithinAvailability, deactivate)
- [x] T8 Reservation entity + ReservationConfirmedEvent — entity EXISTS (audit cancel invariant); event file `src/domain/events/reservation-confirmed.event.ts` MISSING → create (type literal, frozen)
- [x] T9 Incident entity — EXISTS; audit stateBehavior delegation, resolvedAt on resolve
- [x] T10 Commands + CommandHandler/CommandBus ports — commands EXIST; audit/complete bounded generics (no `any`), command bus port interface
- [x] T11 DTOs — MISSING → create reservation-response.dto.ts + incident-response.dto.ts (plain, JSON-serializable)
- [x] T12 Handlers + CommandBus service — MISSING → create create-reservation.handler.ts (Reader ports + factory + bus), create-incident.handler.ts, command-bus.service.ts
- [x] T13 In-memory repositories — MISSING → 3 classes implementing Reader+Writer, seeds 3–5 spaces, findBySpaceAndSlot filters active+overlapping
- [x] T14 LocalEventBus + NotificationListener — MISSING → Map<type, Set>, Promise.allSettled never-throw, typed listener
- [x] T15 HTTP controllers + routes + middleware (incl. D4 idempotency + rate-limit) — MISSING → Zod at controllers, APIError shape, middleware order helmet→cors→json→logger→rateLimiter→routes→errorHandler LAST
- [x] T16 DI container + bootstrap main.ts — MISSING → composition root registers strategies per role, wires everything, listen :3000
- [x] T17 Unit tests: value objects (tests/unit/value-objects.test.ts, ≥20 cases)
- [x] T18 Unit tests: cost strategies + state machine (tests/unit/cost-strategies.test.ts, tests/unit/state-machine.test.ts)
- [x] T19 Unit tests: entities (tests/unit/entities.test.ts)
- [x] T20 Integration tests: handlers + event-bus + idempotency middleware (3 files)
- [x] T21 E2E tests: HTTP endpoints (tests/e2e/api.test.ts)
- [x] Final: `pnpm test` green; `tsc` build clean; report verified outcome

## Route declaration
- T0/T0a: delegated writer (config — 3 non-trivial files) + bounded shell action (pnpm install, test run).
- Domain audit/fixes (T1–T10): delegated writer (2+ non-trivial files).
- Application remainder (T11–T12): same delegated writer chain.
- Infrastructure (T13–T16): delegated writer (14 files).
- Tests (T17–T21): delegated writer (6 files), after src compiles.
- Verification: writer runs `## Verification` commands; orchestrator spot-checks.

## Verification evidence
- T0 audit: glob + read of existing files (see task updates below)
- Environment: Node/pnpm versions recorded at T0a
- T0a (env): node v24.19.0, pnpm 11.22.0, tsc (pnpm exec tsc --version) → "Version 6.0.3"
- T0a `pnpm install`: OK (exit 0). Resolved latest-stable deps: helmet 8.3.0, cors 2.8.6 (latest is 2.8.6, NOT 2.9.0), express-rate-limit 8.7.1, zod 4.6.7, @types/node 22.20.5; typescript downgraded 7.0.2 → 6.0.3 (single compiler, Known Issue 2). 3 deprecated subdepend. warnings (glob@10.5.0, glob@7.2.3, inflight@1.0.6) — non-blocking.
- T0a `pnpm test`: exit 1, "No tests found" (jest default fails with 0 matches; config itself validated — roots src+tests scanned, 33 files checked, 0 testMatch). `tests/` dir created with placeholder README.md so Jest roots validation passes before T17. Unblocking options: first test file lands in T17, or add `--passWithNoTests` (deviates from §13 script spec). Non-fatal Node warning printed: "Failed to load the ES module: jest.config.ts" — config loads correctly despite it (noise from Jest 30's TS config loader under CJS).
- T0a `pnpm build`: exit 2 — TS5107 `moduleResolution: node` deprecated in TS 6.0.3; resolved by adding `"ignoreDeprecations": "6.0"` to tsconfig (the TS-sanctioned flag; keeps §13 `moduleResolution: node` exactly, no node16). After that, `tsc` reaches src and fails on EXISTING src files (untouched, per task rules): 14 files, 30 errors in 3 root classes — (1) missing/unresolved type imports in repositories + commands (`Cannot find name 'IncidentId'/'Reservation'/'TimeSlot'/'SpaceId'/'Incident'/'Space'/'Command'/'ReservationResponseDto'/'IncidentResponseDto'`), (2) `Cannot find name 'crypto'` in space/reservation/incident entities (line ~27–36: `crypto.randomUUID()` without import), (3) noUnusedLocals/noUnusedParameters (TS6133/TS6196) on unused type params (`T` in command.interface.ts) and unused var (`resolvedBy` in incident.entity.ts, `CreateReservationCommand`/`CommandHandler` self-referential type aliases). Full list in the delegated-writer report. src/ untouched per rules; these belong to T1–T12 domain/application fixes.

### T1–T12 (this phase)
- `pnpm build` (before): exit 2, 30 errors (classes above).
- `pnpm build` (after): **exit 0** — full clean compile of src with all strict flags ON.
- `pnpm test`: exit 1, "No tests found" (expected — test tasks are T17–T21; no `--passWithNoTests` added).
- T1 audit: all 6 VOs conform — UUID-v4-regex branded ID classes (SpaceId/ReservationId/IncidentId, camelCase `Id` suffix), UserRole 4-role union with freeze, Cost PEN default in `fromCalculation` + half-up 2-decimals rounding + amount ≥ 0 + non-empty currency, TimeSlot end>start + same-day + strict-inequality `overlaps` (touching endpoints do NOT overlap) + freeze. No fixes needed (IncidentState validation VO exists; the full transition matrix lives in the §9 state machine, T6).
- T2 audit: 3 exception classes conform (UPPER_SNAKE `code`, `instanceof`-able Error subclasses). FIXES: `export` added to previously-unexported `EntityNotFoundException` and `ReservationConflictException`; ctor params reordered to `(message, code = DEFAULT)` for proper message-first ergonomics.
- T3 audit: 6 port interfaces correct (Reader/Writer split; SpaceReader 3 / ReservationReader 3 incl. active-only `findBySpaceAndSlot` / IncidentReader 2 methods each + respective Writers). FIX: added missing `import type`-equivalent imports (entities + ID/Slot VOs) to the 3 repository files. Zero infra imports confirmed.
- T4 audit: `DomainEvent` (literal-`type` contract) + typed `EventListener<TEvent>` exist; no event `as` payload casts, no magic strings in dispatch. NEW: `src/domain/events/reservation-confirmed.event.ts` — class with `type = 'ReservationConfirmed' as const`, occurredOn Date, reservationId/spaceId/userId/cost/timeSlot, params-object ctor, `Object.freeze(this)`.
- T5 audit: CostStrategyFactory is exactly the D2 registry (`Map<UserRoleType, () => CostCalculationStrategy>` + `register` + `Map.get` in `createForRole`, no switch). Strategies stateless and, via `Cost.fromCalculation`: Neighbor ×1.0, YOUTH shares it per composition-root table, Senior ×0.5, PrivateClub ×1.2. No fixes needed.
- T6 audit: full transition matrix verified against Appendix A — UnderReview→approve/Reject, resolve THROWS; Approved→resolve only; Rejected and Resolved terminal (all three methods throw `InvalidStateTransitionException`). No fixes.
- T7 audit: `Space.create` already validated name 1–200, capacity > 0, ≥1 availability window; `isSlotWithinAvailability` correct. FIXES: `randomUUID` imported (`crypto.randomUUID` was a TS2304); read access to activity exposed via public `get isActive()` over private `_isActive` (no public setter; handlers need the read per §10 step 5).
- T8 audit: `Reservation.create` ok (userId non-empty, UUID generation); `cancel()` throws when already inactive. Same `randomUUID` + `get isActive()` access fixes; DTO mapping needs the read.
- T9 audit: `Incident` approves/rejects/resolve via stateBehavior delegation, resolvedAt set to `new Date()` on resolve. FIXES: `resolve(_resolvedBy?: string)` (design decision #5: resolvedBy omitted in v1 — underscore keeps the guide's signature under noUnusedParameters); `get resolvedAt()` public read over private `_resolvedAt`; ADDED missing `reporterId` non-empty invariant (§9 table: "reporterId: string // non-empty"); `randomUUID` imported.
- T10: `Command` collapsed to `interface Command { readonly type: string }` (fix for TS6133 under strict flags per orchestrator decision); `CreateReservationCommand`/`CreateIncidentCommand` now `export interface ... extends Command` with literal `type`. NEW `src/application/ports/command-bus.interface.ts`: `CommandHandler<TCommand extends Command, TResult>` (bounded, no `any`) + `CommandBus` port. OLD `src/application/ports/command-handler.interface.ts` DELETED (untracked, content consolidated).
- T11: NEW `src/application/dtos/reservation-response.dto.ts` + `incident-response.dto.ts` — plain JSON-serializable interfaces per §10; NO runtime domain imports (reservation DTO keeps §10's `role: UserRoleType` via `import type` — zero runtime dependency).
- T12: NEW `src/application/handlers/create-reservation.handler.ts` (deps: SpaceReader, ReservationReader, ReservationWriter, CostStrategyFactory, DomainEventBus — Reader ports where no write, D3) executing §10's 12 steps exactly: VOs (400-class Error) → findById → inactive = EntityNotFoundException (404) → availability Error → conflict via `findBySpaceAndSlot` → ReservationConflictException (409) → cost via factory → create → save → publish `ReservationConfirmedEvent` AFTER save → return DTO. NEW `create-incident.handler.ts` (deps: SpaceReader + IncidentWriter; inactive space = Error "cannot file incident on inactive space"). NEW `src/application/services/command-bus.service.ts` — `Map<string, CommandHandler>` keyed by `command.type`; `register` + typed `execute`; `Error` on unregistered type; only the map-variance `as CommandHandler<Command, unknown>` storage cast.
- Grep audit (post-implementation): zero `any`, zero switches in factories/buses, zero `ReservationID`, zero Zod in domain/application; remaining `as` casts are blueprint-sanctioned only (bus storage variance, `'ReservationConfirmed' as const`, VO union narrowing per §9 samples) — no event/handler payload casts.

## Acceptance criteria
- All 21 tasks complete or verified complete.
- `pnpm test` green; `pnpm build` (tsc) clean.
- No stub-specific violations: no `any` handlers, no `as` event casts, no switch in factory, Reader/Writer split honored, PEN default.
- Database/files under DATABASE.md untouched.

## Progress / next step
- Pending: create odd/<feature>/tasks mirror in Engram; T0 audit detail; T0a config.
- T1–T12 DONE (2026-10-17): all 30 tsc errors fixed; src compiles clean (exit 0) with strict flags ON. Deviations from orchestrator's literal instructions, all documented: (1) DTO imports removed from command files — with `Command` collapsed to non-generic, the `extends Command<ReservationResponseDto>` result-type link is dead code under noUnusedLocals; result typing now lives on the handlers. (2) TS 6.0 `types: []` breaking change discovered (no auto-@types-inclusion): tsconfig.json is locked, so Node API declarations load via new ambient file `src/types/node.d.ts` (`/// <reference types="node" />`) — equivalent to `"types": ["node"]`, which would otherwise belong in tsconfig; recommend the orchestrator consider moving it into tsconfig later (needs `"types": ["node"]`, and later `"types": ["node", "jest"]` for T17+). (3) Entity activity/timestamps exposed via public getters (`get isActive()`, `get resolvedAt()`) over private fields instead of blueprint's public mutable fields — satisfies both "no public setters" (§9) and §10 handlers'/DTOs' read needs, strictly better than the guide's sample field visibility. (4) CommandBusService.execute keeps the guide's §10 promise-level `as Promise<TResult>` variance cast (blueprint text sanctions it; the only `as` after the map-variance one). Next: T13–T16 infrastructure, then T17–T21 tests.

### T13–T16 (infrastructure, this phase) — DONE 2026-10-17
- 17 new files: 3 in-memory repositories (Reader+Writer each), LocalEventBus + NotificationListener, 4 middlewares (error-handler/request-logger/idempotency/rate-limit), 2 controllers, 2 route modules, `src/types/express.d.ts` (global Express.Request.requestId augmentation) + `src/types/cors.d.ts` (cors@2.8.6 untyped shim — same tooling-lock situation as node.d.ts; NOT in §12's file list, documented below), `src/infrastructure/di/container.ts` (+ buildContainer composition root), `src/main.ts`.
- `pnpm build` (before): exit 2 — 7 errors: `import type` used where value needed (Space entity static create, handlers `new`), TS6133 unused `req`/`next` in errorHandler (renamed `_req`/`_next`), Express 5 params type is `string | string[] | undefined` (noUncheckedIndexedAccess-aware fallback read), and cors@2.8.6 ships NO types → TS7016.
- `pnpm build` (after): **exit 0**, clean compile, strict flags ON (exactOptionalPropertyTypes, noUncheckedIndexedAccess).
- T13: seeds are 4 spaces (varied SpaceType, capacity 4–50, base price 40–150 PEN, distinct same-day availability windows pinned to the local calendar day — windows refresh on restart), all active. Reservation repo `findBySpaceAndSlot` filters same spaceId + `isActive` + `overlaps()` (touching endpoints excluded by the VO). Incident repo filters `findBySpaceId`.
- T14: `Map<string, Set<EventListener<DomainEvent>>>` keyed by event type literal; Set dedup; `Promise.allSettled`, rejected reasons logged via `console.error('Event handler failed:', reason)`, never propagated. The single `as` is the sanctioned registry-variance cast. NotificationListener: no cast, ~100ms simulated await, EMAIL/PUSH lines verbatim per §11 sample. Subscribed to `'ReservationConfirmed'` (compile-checked against `ReservationConfirmedEvent['type']`) inside buildContainer (§11 step 4).
- T15: Zod only at controllers (zod 4 `z.iso.datetime()` for ISO slots; role enum matches `UserRoleType` union; description 1–2000); exceptions propagate to errorHandler. D4 idempotency implemented exactly per §11: client `Idempotency-Key`, 400 MISSING_IDEMPOTENCY_KEY, sha256 `hashPayload`, 24h TTL constant, 422 payload_mismatch / 409 in_flight (details.reason), completed→201 replay via `res.json(existing.response.body)`, atomic synchronous claim (no await between get+set), res.send intercepted storing 2xx only, reviewer comment for persistent-store replacement. Stale records past TTL treated as absent. Store getter exported for T20-isolated tests (`getIdempotencyStore`). Rate limit: 100 req / 15 min, draft-8 headers, rate-limit errors use the APIError shape.
- T16: Container per §11 (Map factories + instances, register/resolve; the two `as T` return casts ARE §11's blueprint sample — documented as blueprint-sanctioned storage-variance). buildContainer registers the 4 roles in the factory registry (NEIGHBOR/YOUTH→NeighborDefault, SENIOR→SeniorDiscount, PRIVATE_CLUB→PrivateClub), handlers, CommandBusService, controllers, routes; concretes appear ONLY there. main.ts boots per §11 order with helmet→cors→json→requestLogger→rateLimiter→routes→errorHandler LAST, listens on 3000, logs a startup line.
- `pnpm test`: exit 1, "No tests found" (expected — T17–T21; no `--passWithNoTests`).
- Smoke (node dist/main.js, background + curl, process stopped after): listen log `comuna-sport-api listening on http://localhost:3000`; POST reservation without key → 400 `MISSING_IDEMPOTENCY_KEY`; POST with key to unknown UUID → 404 `SPACE_NOT_FOUND` (EntityNotFoundException→404 mapping + APIError shape verified); malformed JSON → 400 `BAD_REQUEST` (errorHandler generic Error path); requestLogger lines `[POST /spaces/...] 400 7ms requestId=...` (module augmentation active). Port released after stop (only TIME_WAIT).
- Container-flow verification (one-shot node script against dist, same wiring the server uses): 4 seeded spaces printed with type/capacity/base/window; SENIOR on base 100 → cost { amount: 50, currency: PEN } (registry factory + strategy wiring via D2 composition root, not direct instantiation); SECOND execute on same slot → ReservationConflictException `RESERVATION_CONFLICT` (findBySpaceAndSlot optimistic lock + conflict mapping source); incident DTO `{ state: 'UNDER_REVIEW', resolvedAt: null }`; `[EMAIL]`/`[PUSH]` notification lines printed (listener wired to bus).
- Deviations from orchestrator's literal instructions, all documented: (1) `src/types/cors.d.ts` added (17th file, beyond §12's 13-file infra count): cors@2.8.6 has no bundled types and package.json is locked — ambient `declare module 'cors'` shim replicating the node.d.ts precedent; recommend `@types/cors` on the next tooling change instead. (2) Idempotency capture parses the JSON string Express hands to `res.send` (res.json serializes first, then delegates to this.send) so the stored body is the DTO and `json()` replay is not double-encoded — a strict reading of §11's snippet would double-encode every replay. (3) Container `resolve<T>` keeps §11's `as T` cast verbatim (wider than the orchestrator's two-cast whitelist, but it is the blueprint's own official Container code); cast audit after build: only sanctioned casts remain (event-bus registry variance, command-bus storage variance — pre-existing, container §11 storage lookup, plus pre-existing domain literal casts). (4) Server smoke did 201-replay not via HTTP (seed IDs are randomUUID per process, so a scripted flow through the SAME built container was used for the full happy path instead); HTTP 201 happy path will be covered by T21 supertest e2e.
- Next: T17–T21 tests.

### T17–T21 (tests, this phase) — DONE 2026-10-17
- 8 test files created under `tests/` (4 unit, 3 integration, 1 e2e). `src/main.ts` refactor ONLY (T21 enabler): `createApp` exported verbatim (middleware order and app wiring untouched) and `bootstrap()` guarded behind `require.main === module` — supertest e2e builds the production app via `createApp(buildContainer())` with no open port; tsconfig/package.json untouched (jest.config.ts's inline tsconfig handles ts-jest, so no `"types"` shim was needed; no tsconfig change made).
- T17 `tests/unit/value-objects.test.ts` — 46 cases: UUID v4 regex + empty/garbage + NON-v4 (version nibble) and bad-variant rejection for all 3 branded IDs; UserRole 4 valid roles + invalid → 'invalid user role'; Cost amount<0 / empty / whitespace currency; `Cost.fromCalculation(33.33*0.5)` → 16.67 PEN, `50.50*1.2` → 60.60; TimeSlot end<=start throw, cross-day throw, touching endpoints 10:00-12:00 vs 12:00-14:00 overlap FALSE, partial/containment TRUE, disjoint FALSE; `Object.isFrozen` on every VO; compile-level gates via `@ts-expect-error` on the private constructor + exact type-shaped constructor-identity assertion (VO instances are structurally compatible since `value` is a plain string — disjoint type IDENTITY asserted at runtime, documented in the test).
- T18a `tests/unit/cost-strategies.test.ts` — 10 cases through the registry factory per §5: NEIGHBOR(100)→100, YOUTH(100)→100, SENIOR(100)→50, PRIVATE_CLUB(50.50)→60.60, PRIVATE_CLUB(100)→120; registry miss message includes the role; stateless double-call; `register` extension + override resolve; concretes not referenced by the factory.
- T18b `tests/unit/state-machine.test.ts` — 19 cases: full §9 matrix — 3 valid transitions + 9 invalid across the 4×3 matrix, every invalid throwing `InvalidStateTransitionException` with code `STATE_TRANSITION_INVALID`; invalid attempts leave state untouched; Incident entity delegation (approve/reject/resolve, getState() reflects, resolvedAt set ONLY on resolve, RESOLVED terminal).
- T19 `tests/unit/entities.test.ts` — 27 cases: Space name length 0/201 throw, empty availabilityWindows throw, capacity 0 throw, `isSlotWithinAvailability` membership, deactivate; Reservation.create generates UUID v4, cancel sets `isActive` false, double cancel throws; Incident initial UNDER_REVIEW, resolvedAt null until resolve, description >2000 throws.
- T20a `tests/integration/handlers.test.ts` — 11 cases wiring REAL in-memory repos + registry factory + LocalEventBus exactly like buildContainer: full reservation command flow (success DTO cost computed, unknown space `SPACE_NOT_FOUND`, inactive space 404, slot outside availability 400, `RESERVATION_CONFLICT`, cancel-then-recreate same slot succeeds, `ReservationConfirmedEvent` published exactly ONCE with correct payload AFTER save via pre-registered typed spy listener); incident flow (UNDER_REVIEW, inactive space 'cannot file incident on inactive space', DTO fields).
- T20b `tests/integration/event-bus.test.ts` — 6 cases: subscribe/publish invokes listener; same handler registered twice invoked ONCE per publish (Set dedup); a listener that rejects does NOT propagate (fire-and-forget, allSettled) and other listeners still run; unknown event type no-op.
- T20c `tests/integration/idempotency.middleware.test.ts` — 9 cases, isolated per express-ts on a probe route: 400 missing header (+empty-string header); same key+payload → handler executes and caches; replay → cached body returned and handler NOT re-invoked (spy counter); second request while first in_flight → 409 `in_flight`; payload mismatch → 422 `payload_mismatch`; non-2xx responses never cached; TTL expiry claimable again via deterministic direct store manipulation (fake-Date, no timers ambiguity) + within-TTL control case.
- T21 `tests/e2e/api.test.ts` — 13 cases, supertest against the built app with real container/seed: reservation happy path 201 with DTO shape (cost matches role formula NEIGHBOR ×1.0 / SENIOR ×0.5 / PRIVATE_CLUB ×1.2 60.60); missing Idempotency-Key → 400 `MISSING_IDEMPOTENCY_KEY`; bad UUID → 400; unknown space → 404 `SPACE_NOT_FOUND`; slot outside availability → 400; duplicate active slot → 409 `RESERVATION_CONFLICT`; invalid role → 400; idempotency e2e replay (same key+body → SAME reservation id; different body → 422); POST /incidents 201 UNDER_REVIEW resolvedAt null + 404 unknown space + inactive space → 400 'cannot file incident on inactive space'; EVERY error body asserted against `{ error: { code, message } }`.
- Test rules honored: ZERO `as any` / `(x as any)` (grep-verified across tests/); typed listeners `EventListener<DomainEvent>`; precise typed fakes; no server left listening (app built without listen; `require.main` guard); no commit made.
- **Verification (observed)**:
  - `pnpm build`: **exit 0** (after the main.ts refactor)
  - `pnpm test`: **exit 0** — `Test Suites: 8 passed, 8 total / Tests: 141 passed, 141 total / Time: ~9 s / Ran all test suites.`
  - `pnpm test tests/integration/`: **exit 0** — 3 suites, 26 tests.
  - `pnpm test tests/e2e/`: **exit 0** — 1 suite, 13 tests.
  - Per-file counts: value-objects 46, cost-strategies 10, state-machine 19, entities 27 (unit 102); handlers 11, event-bus 6, idempotency.middleware 9 (integration 26); api.test 13 (e2e) = 141 total.
- Pre-existing non-blocking noise (unchanged from T0a): Jest 30's node warning "Failed to load the ES module: jest.config.ts" — config loads correctly under CJS.
- Next: T0–T21 all complete (database effort tracked separately in DATABASE.md).

### Post-plan change: compile-time ID brand — DONE 2026-10-17
- **What**: Added a declared-only phantom brand field to the 3 ID VOs (SpaceId/ReservationId/IncidentId): `public declare readonly __brand: 'SpaceId'` (literal per ID; IncidentId included per post-plan decision). The declared field emits ZERO runtime code (dist verified: 0 `__brand` occurrences) and changes no behavior, message, validation, or construction API — `create`, public `value: string`, freeze, explicit return types all unchanged.
- **Why**: DEVELOPMENT.md §9 (API principle #6) and its Table 2 check "`SpaceId` not assignable to `ReservationId`" required a REAL compile-time brand; the pre-change VOs (private ctor + public `value: string`) were structurally compatible, so a SpaceId could sit in a `ReservationId` slot with no compile error (documented gap, asserted only at runtime via constructor identity). Fixes feature doc risk "structural-compat gap".
- **Design note (why public, not private)**: first attempt used `private declare readonly __brand: '...'` — failed `pnpm build`: `Object.freeze(new X(...))` in `create()` runs through `Readonly<T>`, a homomorphic mapped type that STRIPS private members → TS2741 "Property '__brand' is missing in type 'Readonly<X>' but required in type 'X'" (3 errors, exit 2). The public declared brand with per-ID distinct literals fixes the exact same incompatibility WITHOUT any `as` cast (cast audit kept at blueprint-sanctioned-only) and matches the guide's own branded shape `string & { readonly __brand: 'SpaceId' }` (public `__brand`).
- **Evidence** (observed):
  - `pnpm build`: exit 0 (before change), exit 2 (private-brand attempt), exit 0 (final public-brand).
  - Throwaway probe `src/brand-probe.ts` (cross-assignments `const r: ReservationId = s; const i: IncidentId = s;`), `pnpm exec tsc --noEmit`: exit 2 with exactly 2 errors — TS2322 `Type 'SpaceId' is not assignable to type 'ReservationId'. Types of property '__brand' are incompatible. Type '"SpaceId"' is not assignable to type '"ReservationId"'` and the `IncidentId` twin. Probe deleted; `pnpm build` re-run → exit 0.
  - `pnpm test`: exit 0 — `Test Suites: 8 passed, 8 total / Tests: 141 passed, 141 total` (case count unchanged: 46 value-objects). T17's compile-gate case now asserts the REAL gate: `@ts-expect-error - SpaceId is not assignable to ReservationId (compile-time brand gate)` on a genuine cross-ID assignment — with ts-jest failing on unused `@ts-expect-error`, a passing suite doubles as proof the brand is active. Runtime-identity assertions (constructor disjointness) retained.
  - Dist check: `dist/domain/value-objects/*.vo.js` contain no `__brand` — no runtime cost.
- Not touched: non-ID VOs (UserRole/Cost/TimeSlot/IncidentState), src/dev.ts, package.json, tsconfig.json, jest.config.ts, DEVELOPMENT.md, DATABASE.md.
