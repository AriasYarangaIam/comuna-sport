# Deployment — ComunaSport

Three moving parts, all deployed:

| Piece | Platform | URL |
|---|---|---|
| SPA (`apps/web`) | Vercel project `web` | https://web-rust-iota-ncqbfyebew.vercel.app |
| API (`src/`) | Vercel project `comuna-sport-api` (Node function) | https://comuna-sport-api.vercel.app |
| PostgreSQL | Neon, project `weathered-morning-43096285`, `aws-sa-east-1`, PG 18.6 | console.neon.tech |

Both Vercel projects live in the team `fabricio-arias-projects-74046134` and are connected to
`github.com/AriasYarangaIam/comuna-sport`.

## Environment variables

| Variable | Where | Required | Meaning |
|---|---|---|---|
| `DATABASE_URL` | API project (Production + Preview) | yes | PostgreSQL connection string. The API uses the **pooled** Neon host (`…-pooler…`) because serverless instances each hold a pool. `sslmode=require` is kept. |
| `PORT` | API process | no | Listening port. Defaults to `3000`; platforms inject their own. An unusable value fails the boot with `PORT must be an integer between 1 and 65535`. |
| `VITE_API_BASE_URL` | Web project (Production) | yes | Absolute API origin, inlined at build time. Changing it requires a redeploy. |

TLS for the database comes from the connection string, not from code: `sslmode=require` is treated
by `pg-connection-string` as `verify-full`.

## How the API is deployed

`api/index.ts` exports the Express app; root `vercel.json` routes every path to it:

```json
{
  "framework": null,
  "buildCommand": "pnpm build && mkdir -p public",
  "outputDirectory": "public",
  "functions": { "api/index.ts": { "maxDuration": 30, "memory": 1024 } },
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
}
```

Notes learned from the actual deploys:

- `outputDirectory: null` is ignored — Vercel demands an existing directory, hence `public/`.
- A `Dockerfile` at the repository root makes Vercel detect a *container service* and reject the
  `functions` block. The image therefore lives at `deploy/Dockerfile`.
- `api/index.ts` is bundled by Vercel's esbuild, so `pnpm build` (`rootDir` is `src`) never sees it.
  `pnpm typecheck:api` covers it through `tsconfig.api.json`; run it (or `pnpm typecheck`) before a
  redeploy — the live deployment only proves it wires correctly, not that it type-checks.
- Rate limiting is per serverless instance (in-memory store). Acceptable for this stage; a shared
  store would be needed for a strict global limit.

Verify the deployed API:

```bash
curl -s https://comuna-sport-api.vercel.app/spaces | head -c 200   # → 4 spaces
```

Redeploy the API after a change:

```bash
pnpm dlx vercel@latest --prod --yes          # from the repository root
```

## Database

Schema and catalog are already applied to Neon. To reproduce on a new database:

```bash
DATABASE_URL="postgresql://…?sslmode=require" node db/migrate.js
DATABASE_URL="postgresql://…?sslmode=require" node db/seed.js
```

`db/migrate.js` applies `db/migrations/*.sql` in order and records them in `schema_migrations`;
`db/seed.js` re-runs `002_seed_spaces.sql`, which upserts the four reference spaces and re-anchors
their 30 availability windows on the current `America/Lima` business day. The full Jest suite also
passes against that managed database (`190/190` on PG 18.6), so schema, constraints, adapters and
queries are known to work there.

## Frontend

`apps/web/vercel.json` sets the framework, build command, output directory and the SPA rewrite so
deep links such as `/mis-reservas` resolve to `index.html`.

- Vercel **Root Directory: `apps/web`** (pnpm workspace; Vercel installs from the repository root).
- `VITE_API_BASE_URL=https://comuna-sport-api.vercel.app` in Production.

```bash
cd apps/web
pnpm dlx vercel@latest --prod --yes
```

A public HTTPS page cannot reach `http://localhost:3000` (the browser aborts with
`net::ERR_ABORTED`), which is why the deployed SPA must point at the public API and not at the local
one. `pnpm preview` (local static build) is the only place a `localhost` base URL works.

## Deployed behaviour worth knowing

- **CORS is restricted in production.** `CORS_ALLOWED_ORIGINS` is set on the `comuna-sport-api`
  project to the SPA's production origin, so that origin — and only it — receives
  `Access-Control-Allow-Origin`; any other origin gets the response without the header. A fresh clone
  or a deployment without the variable keeps the open demo default (`cors()` defaults, `*`).

  ```bash
  pnpm dlx vercel@latest env ls   # CORS_ALLOWED_ORIGINS, CRON_SECRET (Production)
  ```

  ```bash
  pnpm dlx vercel@latest env add CORS_ALLOWED_ORIGINS production
  # value: https://web-rust-iota-ncqbfyebew.vercel.app
  pnpm dlx vercel@latest --prod --yes
  ```

  The value is a comma-separated list of absolute origins (`scheme://host[:port]`, no path, no
  trailing slash). A malformed entry throws at boot instead of silently falling back to open CORS.

  **Preview deployments:** because the allowlist is exact, a SPA preview (`web-git-<branch>-*.vercel.app`,
  `web-<hash>-*.vercel.app`) is blocked by CORS when it calls the production API. Add that origin to
  the variable, or point the preview at its own API, before demoing from a preview URL.
- **`trust proxy` is one hop** (`TRUST_PROXY_HOPS` in `src/infrastructure/config/runtime.ts`), so the
  forwarded client address is the rate-limit key instead of the platform edge.
- **Availability is informative.** `GET /spaces/availability` answers which spaces have the slot
  inside their availability window; overlap is validated when the reservation is created, so a slot
  can be listed and still answer `409 RESERVATION_CONFLICT`, and the SPA offers alternatives.
- **Idempotency is durable** in PostgreSQL with a 24 h TTL. `pnpm db:sweep` clears expired rows by
  hand and `GET /internal/idempotency/sweep` does the same over HTTP, so a scheduler can drive it:

  | | |
  | :--- | :--- |
  | Route | `GET /internal/idempotency/sweep` → `200 {"swept": <n>}` |
  | Auth | `Authorization: Bearer $CRON_SECRET` (constant-time compare) |
  | Scheduled by | `crons` in `vercel.json` — daily at `0 3 * * *` UTC (Hobby allows once a day) |
  | Unset `CRON_SECRET` | the route answers `404 SWEEP_DISABLED` and nothing is exposed |
  | Wrong token | `401 UNAUTHORIZED` |

  Vercel sends the `Authorization` header automatically when `CRON_SECRET` exists on the project:

  ```bash
  pnpm dlx vercel@latest env add CRON_SECRET production   # any random string (≥16 chars)
  pnpm dlx vercel@latest --prod --yes
  ```

  Any other scheduler works too: it only has to send that header to the same path. Confirmed on the
  live project: `vercel crons ls` lists `0 3 * * *`, a call without the token answers `401`, and the
  first authenticated call answered `{"swept": 9}` — the keys that accumulated while the sweep only
  existed as a manual script.
- **Shutdown is graceful.** `SIGTERM`/`SIGINT` stop the listener first and then release the
  PostgreSQL pool (`Container.close()`); a repeated signal joins the first run instead of closing
  twice. Before this, the pool was only closed by tests.
- **Neon free tier** suspends the compute when idle: the first request after a quiet period pays a
  cold start (observed ~1.7 s).

## Container alternative (Render, Railway, Fly)

```bash
docker build -f deploy/Dockerfile -t comuna-sport-api .
docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://…?sslmode=require" comuna-sport-api
```

`render.yaml` describes the same service as a native Node runtime
(`node db/migrate.js && node db/seed.js && node dist/main.js`), for hosts that build from a Git
repository.

## Local production-mode check

```bash
pnpm build && node dist/main.js                                   # API on :3000
cd apps/web && VITE_API_BASE_URL=http://localhost:3000 pnpm build # static bundle
cd apps/web && pnpm preview --port 4180                           # serves dist/
```
