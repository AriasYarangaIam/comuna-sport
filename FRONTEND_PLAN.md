# Plan de Frontend — ComunaSport

> Versión 1.0 · Brief confirmado por el equipo.
> Alcance: documento de plan + scaffold inicial en `apps/web`. No incluye la implementación completa de las 6 pantallas.

---

## 1. Resumen ejecutivo

Este plan define la construcción del cliente web de **ComunaSport**, una SPA que permite a los ciudadanos de Lima consultar espacios deportivos municipales, reservar franjas horarias y reportar daños en la infraestructura.

La propuesta visual generada en **Google Stitch** es un andamio sólido: paleta celeste clara, jerarquía tipográfica clara y flujos de usuario coherentes. El trabajo pendiente es convertir ese andamio en una aplicación de producción: componentizar, conectar con la API, garantizar accesibilidad WCAG 2.1 AA y eliminar dependencias de CDN.

### Decisiones cerradas

| Tema | Decisión | Razón |
|------|----------|-------|
| Ubicación | SPA en `apps/web` | Separa la API del cliente; permite monorepo futuro. |
| Framework | React 19 + Vite 6 + TypeScript | Rápido, moderno, tipado, sin lock-in de framework full-stack. |
| Estilos | Tailwind CSS 4 + PostCSS | Tokens del design system como theme extend; purge integrado. |
| Iconos | Lucide React (SVG inline) | Sin FOUT, accesibles, un solo bundle. |
| Tipografía | `@fontsource/inter` + `@fontsource/jetbrains-mono` | Sin dependencia de Google Fonts en producción. |
| Estado servidor | TanStack Query (React Query) | Cache, reintentos, deduplicación de llamadas. |
| Estado UI | Zustand | Mínimo, para modo lectura fácil y diálogos. |
| Routing | React Router 7 | SPA con lazy loading por ruta. |
| Validación | Zod | Mismo backend/frontend; contratos compartidos. |
| Testing | Vitest + React Testing Library + Playwright | Unitarios, integración con MSW y E2E de flujos críticos. |

### Público objetivo

Uso **mixto móvil/escritorio**, con mobile-first real:

- **Ciudadano en móvil (360 px):** reservar en ≤ 5 interacciones, CTA al pulgar, navegación inferior.
- **Ciudadano en escritorio (1024 px+):** explorar más espacios a la vez, reservar desde diálogo centrado.

---

## 2. Diagnóstico de los entregables de Stitch

### Fortalezas

- **Identidad visual coherente:** paleta celeste costera, proporción 70/20/10, estados semánticos con fondo teñido + texto oscuro.
- **Tipografía funcional:** Inter + JetBrains Mono; jerarquía display/headline/body/label/mono clara.
- **Flujos definidos:** S1 → S2 → S3 → S4 → S5 → S6.
- **Accesibilidad parcial:** algunos `aria-label`, `role="tablist"`, `aria-selected`, focus rings.

### Riesgos y mejoras obligatorias

| Riesgo | Evidencia en Stitch | Corrección en este plan |
|--------|---------------------|-------------------------|
| Tailwind vía CDN | `cdn.tailwindcss.com` en cada HTML | Tailwind compilado con PostCSS; config en `apps/web/tailwind.config.ts`. |
| Material Symbols duplicados | Múltiples hojas de estilo de Google Fonts | Reemplazo por Lucide React. |
| Scripts inline | Lógica de filtros/validación en el HTML | Componentes React con hooks y handlers testeables. |
| Semántica inconsistente | `href="#"`, `<div>` como botones, falta de `<form>` | HTML semántico; `<button>` para acciones, `<a>` para navegación. |
| Zona horaria hardcodeada | Fechas en texto plano | Helpers centralizados `America/Lima` + `Intl.DateTimeFormat`. |
| Sin estados reales | No hay skeletons, empty states ni errores | Cada pantalla define carga/vacío/error en §5. |
| Sin integración API | Valores estáticos | Cliente HTTP + TanStack Query con los endpoints de `DESIGN.md` §6.1. |

---

## 3. Arquitectura de carpetas

```text
apps/web/
├── public/                    # favicon, manifest, assets estáticos
├── src/
│   ├── app/                   # entry point, providers, routing
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/            # design system (puros, sin lógica de negocio)
│   │   ├── ui/                # Button, Input, Badge, Card, Alert, Skeleton
│   │   ├── layout/            # AppShell, BottomNav, TopNav, Footer
│   │   └── domain/            # SpaceCard, TimeSlotPicker, PriceSummary, Stepper, RoleSelector, IncidentTimeline, ReservationReceipt
│   ├── features/              # páginas y lógica de cada flujo
│   │   ├── explore/
│   │   ├── availability/
│   │   ├── reservation/
│   │   ├── receipt/
│   │   ├── my-reservations/
│   │   └── incidents/
│   ├── hooks/                 # queries y mutations de TanStack Query
│   ├── lib/                   # formateo de moneda/fecha, tz helpers, api client
│   ├── stores/                # Zustand stores (UI state)
│   ├── styles/                # Tailwind config, tokens, fonts
│   ├── types/                 # DTOs compartidos/espejados de la API
│   └── utils/                 # helpers puros
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
└── vitest.config.ts
```

---

## 4. Design tokens → Tailwind

Los tokens de `DESIGN.md` §3 se codifican en `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      canvas: '#F4FAFF',
      surface: '#FFFFFF',
      tint: '#E9F4FD',
      border: { DEFAULT: '#CDE4F7', strong: '#A9BDCD' },
      ink: { DEFAULT: '#0C1F2E', soft: '#56718A', muted: '#8FA6B8' },
      sky: {
        50: '#F2F9FF', 100: '#E3F2FF', 200: '#C9E6FE', 300: '#A5D5FB',
        400: '#74BEF5', 500: '#3FA3E8', 600: '#1E86C9', 700: '#15699E',
        800: '#124F77', 900: '#0D3A58',
      },
      success: { bg: '#E4F7F1', text: '#0E7C63' },
      warning: { bg: '#FFF3E0', text: '#9A5B00' },
      danger:  { bg: '#FDECEA', text: '#B42318' },
      info:    { bg: '#E3F2FF', text: '#124F77' },
    },
    borderRadius: {
      control: '8px',
      card: '12px',
      sheet: '16px',
      pill: '9999px',
    },
    boxShadow: {
      card: '0 1px 2px rgba(12,31,46,0.06)',
      raised: '0 8px 24px rgba(18,79,119,0.10)',
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
    fontSize: {
      display: ['32px', { lineHeight: '40px', fontWeight: '600' }],
      'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '600' }],
      'headline-md': ['22px', { lineHeight: '30px', fontWeight: '600' }],
      'headline-sm': ['18px', { lineHeight: '26px', fontWeight: '600' }],
      body: ['16px', { lineHeight: '24px', fontWeight: '400' }],
      small: ['14px', { lineHeight: '20px', fontWeight: '400' }],
      caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
    },
    spacing: {
      'space-xs': '0.25rem', 'space-sm': '0.5rem', 'space-md': '0.75rem',
      'space-lg': '1rem',    'space-xl': '1.5rem', 'space-2xl': '2rem',
      'space-3xl': '3rem',   'space-4xl': '4rem',
    },
  },
},
```

### Motion tokens

```css
:root {
  --dur-instant: 120ms;
  --dur-fast: 180ms;
  --dur-base: 240ms;
  --dur-slow: 320ms;
  --ease-standard: cubic-bezier(.2,0,0,1);
  --ease-emphasis: cubic-bezier(.05,.7,.1,1);
  --ease-exit: cubic-bezier(.3,0,.8,.15);
}
```

`prefers-reduced-motion: reduce` reemplaza todo movimiento por opacidad de `120ms`.

---

## 5. Pantallas, estados y componentes

### Inventario de componentes del design system

| Componente | Estados obligatorios | Responsabilidad |
|------------|----------------------|-----------------|
| `AppShell` | ruta activa, mobile/desktop | navegación + `<main>` semántico |
| `SpaceCard` | activo, inactivo, skeleton | tarjeta de espacio con metadatos |
| `StatusBadge` | success, warning, danger, info, active, inactive | icono + etiqueta de estado |
| `Stepper` | actual, completado, error | pasos del asistente de reserva |
| `RoleSelector` | seleccionado, no seleccionado | tarjetas-radio de categoría comunitaria |
| `TimeSlotPicker` | libre, ocupado, seleccionado, fuera de ventana | franjas horarias |
| `PriceSummary` | calculando, listo, error | desglose de tarifa |
| `ReservationReceipt` | emitido | recibo digital con código copiable |
| `IncidentTimeline` | actual, futuro, terminal | riel de estados de incidente |
| `InlineAlert` | info, warning, danger, success | alerta con icono y acción |
| `EmptyState` | sin resultados, sin reservas, sin reportes | ilustración + acción siguiente |
| `Skeleton` | carga | placeholders celestes |
| `Sheet` / `Dialog` | abierto, cerrando | hoja móvil / diálogo desktop |

### Estados por pantalla

| Pantalla | Carga | Vacío | Error | Éxito |
|----------|-------|-------|-------|-------|
| S1 Explorar | skeletons de tarjetas | "No hay espacios de este tipo" + ver todos | InlineAlert danger + reintentar | — |
| S2 Disponibilidad | skeletons de franjas | "No hay espacios libres" + ver todo el día | InlineAlert warning | selección de franja |
| S3 Asistente | — | — | validación inline, payload_mismatch | redirección a recibo |
| S4 Recibo | — | — | — | código copiable |
| S5 Mis reservas | skeletons | "Aún no tienes reservas" + explorar | InlineAlert danger | — |
| S6 Incidentes | skeletons | "Sin reportes para este espacio" | InlineAlert warning | tarjeta animada arriba |

---

## 6. Integración con la API

### Endpoints a consumir

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/spaces` | S1 catálogo, selects de S3/S6 |
| `GET` | `/spaces/:id` | Detalle, resolver nombre en S4 |
| `GET` | `/spaces/availability?start&end` | S2 franjas libres |
| `POST` | `/spaces/:id/reservations` + `Idempotency-Key` | S3/S4 confirmar reserva |
| `GET` | `/reservations/:id` | Detalle de S5 |
| `GET` | `/users/:userId/reservations` | S5 listado |
| `POST` | `/incidents` | S6 reporte |
| `GET` | `/spaces/:id/incidents` | S6 listado |

### Reglas críticas

1. **Zona horaria `America/Lima`:** toda fecha mostrada con `Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' })`; toda fecha enviada construida como hora de pared de Lima y serializada a ISO UTC.
2. **Idempotencia:** generar `crypto.randomUUID()` al abrir el asistente; reutilizarla en reintentos; rotarla cuando cambien `userId`, `role` o `timeSlot` o tras `422 payload_mismatch`.
3. **Formato de moneda:** `S/ 0.00 PEN` con `font-variant-numeric: tabular-nums`.
4. **Traducción de errores:** usar `error.code`, nunca `error.message`.

### Cliente HTTP

```ts
// src/lib/api.ts
const api = {
  getSpaces: () => fetcher<SpaceDto[]>('/spaces'),
  getAvailability: (start: string, end: string) =>
    fetcher<SpaceDto[]>(`/spaces/availability?start=${start}&end=${end}`),
  createReservation: (spaceId: string, body: ReservationBody, idempotencyKey: string) =>
    fetcher<ReservationDto>(`/spaces/${spaceId}/reservations`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    }),
  getUserReservations: (userId: string) =>
    fetcher<ReservationDto[]>(`/users/${userId}/reservations`),
  createIncident: (body: IncidentBody) =>
    fetcher<IncidentDto>('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  getSpaceIncidents: (spaceId: string) =>
    fetcher<IncidentDto[]>(`/spaces/${spaceId}/incidents`),
};
```

---

## 7. Accesibilidad y rendimiento

### Accesibilidad (WCAG 2.1 AA)

- `<html lang="es-PE">`.
- Skip link al contenido principal.
- Estructura semántica: `header`, `nav`, `main`, `footer`, un `h1` por pantalla.
- Formularios: `<label for>`, `aria-describedby`, `aria-invalid`, foco al primer campo inválido.
- Diálogos/hojas: trampa de foco, `Esc` para cerrar, retorno de foco al disparador.
- Anuncios: `role="alert"` para errores, `role="status"` para confirmaciones y recálculo de precio.
- `prefers-reduced-motion`, `prefers-contrast: more`.
- Objetivos táctiles ≥ 48 × 48 px; en modo lectura fácil ≥ 56 px.

### Rendimiento

- Sin CDNs en producción.
- Lazy loading de rutas y de imágenes.
- Prefetch de `/spaces` y `/spaces/availability` desde S1.
- Cache de TanStack Query con TTL por endpoint.
- `font-display: swap` para fuentes self-host.
- Bundle splitting por ruta.

---

## 8. Testing

| Nivel | Herramienta | Cobertura mínima |
|-------|-------------|------------------|
| Unitario | Vitest + React Testing Library | componentes del design system (`Button`, `Badge`, `SpaceCard`, `PriceSummary`) |
| Integración | Vitest + MSW | flujo de reserva con mocks de API, idempotencia, errores |
| E2E | Playwright | reserva completa en 360 px, teclado, doble clic en confirmar |
| Accesibilidad | axe-core | contrastes, roles, orden de foco en S1, S3, S6 |

---

## 9. Roadmap de implementación

| Fase | Entregable | Semanas |
|------|-----------|---------|
| 0. Setup | `apps/web/` funcional con Vite, Tailwind, tipos, routing, providers. | 0.5 |
| 1. Design system | Tokens, tipografía self-host, iconos, componentes base. | 1 |
| 2. S1 + navegación | `AppShell`, explorar, filtros, estados. | 1 |
| 3. S2 | Disponibilidad, `TimeSlotPicker`, cache. | 1 |
| 4. S3-S4 | Asistente, `RoleSelector`, `PriceSummary`, recibo. | 1.5 |
| 5. S5 | Mis reservas, búsqueda por userId. | 0.75 |
| 6. S6 | Incidentes, timeline, formulario. | 1 |
| 7. QA | a11y, E2E, performance, bundle audit. | 1 |

---

## 10. Criterios de aceptación del plan

- [ ] El scaffold compila con `pnpm dev` sin errores.
- [ ] Tailwind aplica todos los tokens de §4.
- [ ] No hay CDNs en `index.html` de producción.
- [ ] Estructura de carpetas respeta §3.
- [ ] `AppShell` renderiza navegación inferior en 360 px y superior en 1024 px.
- [ ] Lighthouse ≥ 90 en Performance, Accessibility y Best Practices en la página de inicio vacía.

---

## 11. Notas y anti-goals

- **No se implementa** autenticación real, pagos, panel administrativo ni notificaciones push reales.
- **No se modifica** la API existente; el frontend consume los endpoints de `DESIGN.md` §6.1.
- **No se acepta** código generado por Stitch como producción; se usa solo como referencia visual.

---

## 12. Próximos pasos inmediatos

1. Ejecutar `pnpm install` en `apps/web`.
2. Verificar que `pnpm dev` levante la SPA en `http://localhost:5173`.
3. Configurar proxy `/api` hacia `http://localhost:3000` en `vite.config.ts`.
4. Comenzar Fase 1: codificar tokens y componentes base.
