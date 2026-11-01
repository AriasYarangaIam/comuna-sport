# AGENTS.md — comuna-sport-api

## Testing (authoritative)

- **Run:** `pnpm test` (Jest, ts-jest — no build step required).
- **HTTP layer is tested in-process via supertest by default.** Build the production
  app with `createApp(buildContainer())` in tests (`src/main.ts` exports `createApp`
  exactly for this; `bootstrap()` is guarded behind `require.main === module`). This
  opens no port and spawns no process. See `tests/e2e/api.test.ts`.
- **Process-level smoke tests are permitted.** When a smoke test of the real server
  is needed, run it. Every spawned process MUST pass `-WindowStyle Hidden` (or
  `-NoNewWindow` when redirecting output) and MUST be stopped before reporting
  results. A visible console window is a defect. Prefer a one-shot script that
  builds the container and exercises the same wiring the server uses when a full
  HTTP round-trip is not required.

## Rationale

`src/main.ts` was deliberately refactored to export `createApp` so tests could build
the app without listening. Using `pnpm start` to verify behavior bypasses that
design and re-introduces the process-spawning problem the export was created to
avoid.
