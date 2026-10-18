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
- [ ] T13 In-memory repositories — MISSING → 3 classes implementing Reader+Writer, seeds 3–5 spaces, findBySpaceAndSlot filters active+overlapping
- [ ] T14 LocalEventBus + NotificationListener — MISSING → Map<type, Set>, Promise.allSettled never-throw, typed listener
- [ ] T15 HTTP controllers + routes + middleware (incl. D4 idempotency + rate-limit) — MISSING → Zod at controllers, APIError shape, middleware order helmet→cors→json→logger→rateLimiter→routes→errorHandler LAST
- [ ] T16 DI container + bootstrap main.ts — MISSING → composition root registers strategies per role, wires everything, listen :3000
- [ ] T17 Unit tests: value objects (tests/unit/value-objects.test.ts, ≥20 cases)
- [ ] T18 Unit tests: cost strategies + state machine (tests/unit/cost-strategies.test.ts, tests/unit/state-machine.test.ts)
- [ ] T19 Unit tests: entities (tests/unit/entities.test.ts)
- [ ] T20 Integration tests: handlers + event-bus + idempotency middleware (3 files)
- [ ] T21 E2E tests: HTTP endpoints (tests/e2e/api.test.ts)
- [ ] Final: `pnpm test` green; `tsc` build clean; report verified outcome

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
