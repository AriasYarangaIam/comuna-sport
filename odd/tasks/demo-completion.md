# Feature: demo completion (incident lifecycle, rolling horizon, cancellation)

## Specs

**S1 — El ciclo de vida del incidente se puede recorrer por HTTP.**

- Verbatim (usuario, L1): "Si, procede con ello" — aprobando el plan de los puntos 1–3 del análisis.
- Verbatim (`DESIGN.md:50-51`): "auditoría ciudadana (todo daño reportado es rastreable en su ciclo de vida)".
- Verbatim (`DESIGN.md` §6.3): "El agregado lo permite (`incident.entity.ts:74-84`), **sin ruta HTTP**".
- Decisión D1 (verbatim de la opción elegida): "Nueva variable ADMIN_TOKEN; el endpoint exige Authorization: Bearer <token> con comparación de tiempo constante. Sin token configurado → 404 (como el sweep)."
- Contrato exacto:

```
PATCH /incidents/:id     Authorization: Bearer <ADMIN_TOKEN>
  body { state: 'APPROVED' | 'REJECTED' | 'RESOLVED' }
  → 200 IncidentResponseDto (el riel avanza)
  → 400 BAD_REQUEST            state ausente o fuera de {APPROVED,REJECTED,RESOLVED}
  → 401 UNAUTHORIZED           header ausente o token incorrecto (ADMIN_TOKEN configurado)
  → 404 INCIDENT_NOT_FOUND     id desconocido
  → 404 (no ruteable)          ADMIN_TOKEN sin configurar
  → 422 STATE_TRANSITION_INVALID  transición inválida según la máquina de estados
```

- Observable: crear un incidente deja `UNDER_REVIEW`; con token `APPROVED` → 200 y `state: 'APPROVED'`; `RESOLVED` sobre uno ya `REJECTED` → 422 `STATE_TRANSITION_INVALID`; sin `Authorization` → 401; con `ADMIN_TOKEN` unset → 404. Sin `Idempotency-Key` (no crea recursos).

**S2 — La UI muestra el ciclo avanzando desde una pantalla de gestión.**

- Decisión D2 (verbatim): "Ruta /gestion que pide el código y lo guarda en memoria de la sesión (sessionStorage). Botones Aprobar/Rechazar/Resolver sobre el incidente."
- Observable: `/gestion` pide el código si no está en `sessionStorage`; con código válido lista los incidentes del espacio seleccionado y ofrece solo las acciones válidas para el estado actual (Aprobar/Rechazar en `UNDER_REVIEW`, Resolver en `APPROVED`); tras la acción el riel del incidente se actualiza y la vista de incidentes pública refleja el nuevo estado al recargar. Un código inválido se muestra como error de credencial, nunca como error técnico.

**S3 — El horizonte de disponibilidad no caduca.**

- Verbatim (medido en producción, L2): "ventanas por espacio: 30 · primera: 2026-11-04 · última: 2026-12-03".
- Decisión D3 (verbatim): "El seed ya genera 30 días rodantes y se re-ejecuta por cron diario (mismo mecanismo que el sweep). Datos reales en BD, consulta rápida."
- Observable: `GET /internal/catalog/refresh` con `Authorization: Bearer $CRON_SECRET` extiende el horizonte a **hoy + 29 días** para cada espacio activo y responde `200 { "extended": <n> }`; es **idempotente** (segunda llamada seguida → `{ "extended": 0 }`); sin `CRON_SECRET` → 404; sin token válido → 401. `vercel.json` declara el cron diario. Con el adaptador in-memory responde `{ "extended": 0 }` (su horizonte ya es rodante).

**S4 — El vecino puede cancelar su reserva.**

- Verbatim (`DESIGN.md` §6.3): "Cancelar reserva | No existe `DELETE`/`PATCH` en `reservation.routes.ts`".
- Observable:

```
DELETE /reservations/:id
  → 200 ReservationResponseDto con isActive: false
  → 404 RESERVATION_NOT_FOUND   id desconocido
  → 409 RESERVATION_CONFLICT    ya estaba cancelada (cancel() de la entidad es idempotente-fallido)
```

- Tras cancelar, el mismo bloque vuelve a estar disponible: `POST` con otro DNI sobre la misma franja → `201`.

## Cross-cutting

- `pnpm typecheck`, `pnpm build` y `pnpm test` (raíz) exit 0; `cd apps/web && pnpm typecheck && pnpm test:run` exit 0. Sin regresiones en idempotencia, costos, rate limit, CORS, slug/DNI.
- Documentación en el mismo feature: `DESIGN.md` (§6.1 endpoints, §6.3 brechas cerradas, S5/S6 gestión), `DEPLOYMENT.md` (`ADMIN_TOKEN`, cron de catálogo), `.env.example`, `README.md`.
- `.env.example` documenta `ADMIN_TOKEN` (placeholder, sin valor real).

## Tasks

| ID | Specs | Task | Route | Commit |
|----|-------|------|-------|--------|
| T1 | S1 | RED tests API: transiciones (200/400/401/404/422), token constante, ADMIN_TOKEN unset → 404 | inline | — |
| T2 | S1 | Implementación: `ADMIN_TOKEN` en config, guard de comparación constante, `ChangeIncidentStateCommand` + handler + controller + ruta PATCH | inline | — |
| T3 | S3 | RED tests + implementación: `GET /internal/catalog/refresh` (extiende horizonte, idempotente, protegido) + cron en `vercel.json` | inline | — |
| T4 | S4 | RED tests + implementación: `DELETE /reservations/:id` (404 / 409 / libera la franja) | inline | — |
| T5 | S2 | SPA: pantalla `/gestion` con código en sessionStorage, acciones por estado, errores de credencial | inline | — |
| T6 | S1–S4 | Verificación conjunto con evidencia por S# | inline | — |
| T7 | S1–S4 | Documentación (`DESIGN.md`, `DEPLOYMENT.md`, `.env.example`, `README.md`) | inline | — |
| T8 | S1–S4 | Work-unit commits en la rama feature | inline | — |

## Log

L1 (user, verbatim): "Si, procede con ello"
L2 (medición, verbatim de la salida del análisis): "ventanas por espacio: 30 · primera: 2026-11-04 · última: 2026-12-03"
L3 (decisions, verbatim de las opciones elegidas): D1 "ADMIN_TOKEN nuevo (recomendado)"; D2 "Pantalla /gestion con código (recomendado)"; D3 "Seed rodante + cron (recomendado)".
