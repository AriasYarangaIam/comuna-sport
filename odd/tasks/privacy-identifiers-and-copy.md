# Feature: privacy identifiers (DNI + public slugs) and UI copy cleanup

## Header

L1 (user, verbatim): "realiza unos cambios más. Verás, respecto a temas de seguridad y sensibilidad de la información, no exponer los ids tanto "usuarios" y "espacios deportivos", el DNI debería ser el dato que pidamos ya sea para reservar o reportar daños. Además, necesito que quites el boton de "Lectura facil", pues no tiene proposito más que cambiar la información o texto de la web, prefiero vocejo formal pero no tan explicativo respecto al sistema detras, sino con UX sin confundir al usuario con el texto."

Decisions closed with the user (2026-11-17):
- D1: el identificador público de los espacios pasa a ser un **slug** legible (`/spaces/cancha-de-veteranos-miraflores`); requiere migración que agrega la columna `slug`.
- D2: el DNI **nunca** se devuelve en las respuestas de la API (solo se recibe como entrada, validado `^\d{8}$`).
- D3: alcance del copy = quitar el botón "Lectura fácil" + los textos que revelan mecanismos internos (p. ej. "Referencia de operación" con la clave de idempotencia, secciones técnicas del manual de ayuda). El registro formal (usted) se mantiene; no se reescribe todo el copy.
- D4: migración aditiva con backfill del slug; los datos existentes de producción quedan **intactos** (las filas con identificadores libres simplemente no se encuentran al buscar por DNI).

## Specs

**S1 — Las respuestas y rutas de la API no exponen el UUID de los espacios; el público es el slug.**

- Verbatim (L1): "no exponer los ids tanto "usuarios" y "espacios deportivos"".
- Verbatim (D1): "Identificador legible derivado del nombre: /spaces/cancha-veteranos-miraflores. Requiere migración que agrega la columna slug."
- Observable (contrato exacto que ambas unidades deben respetar):

```
GET  /spaces                        → SpaceResponseDto[]   { slug, name, type, capacity, basePrice, isActive, availabilityWindows }   // sin campo id/UUID
GET  /spaces/availability?start&end → SpaceResponseDto[]   // sin campo id/UUID
GET  /spaces/:slug                  → SpaceResponseDto | 404 SPACE_NOT_FOUND
POST /spaces/:slug/reservations    → 201 ReservationResponseDto { id, spaceSlug, role, timeSlot, cost, createdAt, isActive }  // sin spaceId, sin userId
GET  /reservations/:id              → ReservationResponseDto  // id es el UUID de la RESERVA (se conserva); sin spaceId, sin userId
POST /incidents                     → 201 IncidentResponseDto { id, spaceSlug, description, state, createdAt, resolvedAt }  // sin spaceId, sin reporterId
GET  /incidents/:id                 → IncidentResponseDto     // sin spaceId, sin reporterId
GET  /spaces/:slug/incidents        → IncidentResponseDto[]   // sin spaceId, sin reporterId
```

- El orden de rutas se conserva: `/spaces/availability` declarado antes de `/spaces/:slug`.
- Slug = `slugify(nombre)`: minúsculas, sin acentos (áéíóúüñ → aeiouun…), no alfanuméricos → `-`, guiones colapsados y recortados. Ejemplo verbatim: "Cancha de Veteranos Miraflores" → `cancha-de-veteranos-miraflores`.
- Slug desconocido → 404 con el `SPACE_NOT_FOUND` existente (misma forma APIError).
- Internamente el dominio sigue usando `SpaceId` (UUID): el slug se resuelve en los controllers/adaptadores antes de tocar comandos; entidades, VOs y fórmulas de costo no cambian.

**S2 — El DNI (8 dígitos) es el único dato para crear una reserva.**

- Verbatim (L1): "el DNI debería ser el dato que pidamos ya sea para reservar o reportar daños".
- Observable: `POST /spaces/:slug/reservations` body `{ dni, role, timeSlot }` con `dni` validado `^\d{8}$`; un valor que no cumpla responde **400** con la forma APIError existente (paso Zod en el controller, igual que hoy). `userId` deja de existir en body, commandos y respuestas.

**S3 — El DNI (8 dígitos) es el único dato para reportar daños.**

- Verbatim (L1): "ya sea para reservar o reportar daños".
- Observable: `POST /incidents` body `{ spaceSlug, dni, description }` con `dni` validado `^\d{8}$` → 400 en caso contrario. `reporterId` y `spaceId` dejan de existir en body, commandos y respuestas (el campo se llama `dni`, no `reporterDni`).

**S4 — El DNI nunca se devuelve en ninguna respuesta.**

- Verbatim (D2): "El DNI solo se recibe como entrada (con validación ^\d{8}$); los DTOs no lo incluyen. Máxima privacidad."
- Observable: `GET /users/:dni/reservations` valida el parámetro `^\d{8}$` → **400** si no cumple (antes aceptaba cualquier texto); ninguna respuesta de la API contiene `dni`, `userId` ni `reporterId` (grep-verificable sobre los DTOs y las salidas e2e).

**S5 — El slug llega por migración aditiva; los datos existentes quedan intactos.**

- Verbatim (D4): "Migración aditiva que agrega slug (backfill desde el nombre); las filas viejas se quedan y simplemente no aparecen al buscar por DNI nuevo."
- Observable: `db/migrations/004_spaces_slug.sql` es un archivo **nuevo** (001–003 no se reescriben); agrega `spaces.slug` con backfill `slugify(nombre)`, `UNIQUE` + `NOT NULL`; el catálogo futuro que inserte/actualice `db/seed` conserva el slug (trigger o equivalente declarado en la migración — la semilla hace upsert por `ON CONFLICT (id)` y no setea `slug`). Funciona igual en BD nueva (001→004 en orden) y en la producción ya migrada. Ningún DELETE/UPDATE sobre reservas o incidentes existentes.

**S6 — El botón "Lectura fácil" desaparece por completo.**

- Verbatim (L1): "necesito que quites el boton de "Lectura facil", pues no tiene proposito más que cambiar la información o texto de la web".
- Observable: no existe `ReadingModeToggle` ni estado `readingMode` en el store de UI ni su efecto en `AppShell`; ningún botón/aria-label "Lectura fácil" en la SPA (grep); los atributos `data-reading-hide` y cualquier CSS condicionado al modo se eliminan; los tests que lo cubrían se eliminan o se actualizan.

**S7 — El copy visible no explica el sistema de fondo y mantiene el registro formal.**

- Verbatim (L1): "prefiero vocejo formal pero no tan explicativo respecto al sistema detras, sino con UX sin confundir al usuario con el texto."
- Verbatim (D3): "Quitar el botón Lectura Fácil y los textos que revelan mecanismos internos (p. ej. \"Referencia de operación\" con la clave de idempotencia, secciones técnicas del manual de ayuda)."
- Observable: desaparece de la UI visible la "Referencia de operación" con la clave de idempotencia (los dos párrafos con `shortIdempotencyKey` en `ReservationPage`); el manual de ayuda no presenta secciones que expliquen mecanismos internos (idempotencia, API, contratos); el copy restante conserva el tratamiento de usted actual — no se reescribe el texto que no expone mecanismos (alcance D3, no revisión general). En particular NO se introducen voseos.

**Cross-cutting (verificación):**

- `pnpm typecheck` y `pnpm build` (raíz) exit 0; `pnpm test` sin regresiones (suites actualizadas a los nuevos contratos + nuevos tests RED→GREEN por regla); `cd apps/web && pnpm typecheck && pnpm test:run` exit 0.
- Ningún test nuevo usa `as any`; el contrato de idempotencia (400/409/422/replay 201), fórmulas de costo, CORS y rate limit no cambian.
- Documentación afectada por el cambio se actualiza en la misma feature: `DESIGN.md` (§5/§6.1 contratos `:id` → `:slug`, campos DTO, §9.4 Lectura fácil) y `DATABASE.md` (§5 DDL con `slug`, §8 bootstrap con `004`, drift ledger).

## Tasks

| ID | Specs | Task | Route | Commit |
|----|-------|------|-------|--------|
| T1 | S1–S5 | RED tests de contrato API: slug en rutas/DTOs, sin UUID de espacio en respuestas, validación DNI 400 (POST reserva, POST incidente, GET /users/:dni), sin dni/userId/reporterId en ninguna respuesta, 404 slug desconocido | inline (worker provider unavailable) | `466dfd0` |
| T2 | S5 | `db/migrations/004_spaces_slug.sql` (add + backfill + unique/not-null + mantenimiento en seed) y compatibilidad del seed | inline (worker provider unavailable) | `466dfd0` |
| T3 | S1–S4 | Implementación API: resolución de slug en controllers, `SpaceReader.findBySlug` (ambos adaptadores), DTOs sin UUID/DNI, comandos con `dni`, schemas Zod | inline (worker provider unavailable) | `466dfd0` |
| T4 | S1–S4 | SPA sobre el nuevo contrato: rutas/links/query con slug, formularios con DNI (`^\d{8}$`) en reservar, mis reservas e incidentes, mensajes 400/404 | inline (worker provider unavailable) | `a366781` |
| T5 | S6, S7 | SPA: eliminar Lectura Fácil completo + "Referencia de operación" + textos técnicos del manual de ayuda; tests afectados | inline (worker provider unavailable) | `a366781` |
| T6 | S1–S7 | Verificación conjunto: typecheck + build + ambas suites, evidencia por S# | inline | — |
| T7 | S1–S7 | Documentación: `DESIGN.md` (contratos, §9.4) y `DATABASE.md` (004, DDL, drift) | inline | — |
| T8 | S1–S7 | Work-unit commits en la rama feature (sin push, sin PR) | inline | `9b86e58` · `466dfd0` · `a366781` · docs slice |

### Delivery strategy — slice boundary

Rama: `feat/privacy-identifiers` desde `main` (1098cc8). Unidades independientes y superficies
disjuntas: unidad A = `src/`, `db/`, `tests/` (T1–T3); unidad B = `apps/web/` (T4–T5).
El contrato de la S1 fija la interfaz entre ambas. Commits: un slice por unidad + docs (T7)
al cierre. Los cambios de documentación previos sin commit (`README.md`, `tests/README.md`,
`DEPLOYMENT.md`) se separan en su propio commit, antes de la feature.

Slice boundaries (recorded before the docs commit, per the runtime slice check):

| Slice | Commit | Size | Contents |
| --- | --- | --- | --- |
| Pre-existing docs | `9b86e58` | 3 files, +144/−4 | root `README.md`, `tests/README.md`, `DEPLOYMENT.md` |
| Unit A (API + DB + API tests) | `466dfd0` | 33 files, +642/−182 | `src/**`, `db/004`, `tests/**` |
| Unit B (SPA) | `a366781` | 28 files, +258/−365 | `apps/web/**` |
| Feature docs (T7/T8) | pending | — | `DESIGN.md` + this document (`DATABASE.md` stays untracked per maintainer directive) |

The two feature slices exceed the ~400 authored-line guideline because the wire-contract
change (S1–S4) is atomic across controllers, DTOs, handlers, adapters, routes and their
tests — splitting either unit mid-contract would leave a non-building intermediate commit.
Recorded here as the delivery boundary the runtime asked for.

## Log

L1 (user, verbatim): "realiza unos cambios más. Verás, respecto a temas de seguridad y sensibilidad de la información, no exponer los ids tanto "usuarios" y "espacios deportivos", el DNI debería ser el dato que pidamos ya sea para reservar o reportar daños. Además, necesito que quites el boton de "Lectura facil", pues no tiene proposito más que cambiar la información o texto de la web, prefiero vocejo formal pero no tan explicativo respecto al sistema detras, sino con UX sin confundir al usuario con el texto."
L2 (decisions, verbatim de las opciones elegidas por el usuario): D1 "Slug público (recomendado)"; D2 "Nunca (recomendado)"; D3 "Técnico + Lectura Fácil (recomendado)"; D4 "Migración + intactos (recomendado)".
L3 (evidence): `gentle-ai-worker` unavailable (3 launch failures, 0 tool calls — provider error); both units implemented inline by the parent. Verification observed: root `pnpm typecheck`/`pnpm build` exit 0, `pnpm test` 211 passed / 0 failed / 20 hermetic skips; `apps/web` `pnpm typecheck` exit 0, `pnpm test:run` 49/49, `pnpm e2e` 10/10; greps for the old contract (spaceId/userId/reporterId, `ID de usuario`, Lectura fácil, Referencia de operación) return only the intentional §9.4 "retirado" note and the historical annex rows. Migration 004 written but NOT executed (no local Docker; production application pending).
