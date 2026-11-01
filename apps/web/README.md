# ComunaSport Web

Frontend SPA para la plataforma de gestión deportiva municipal ComunaSport.

## Stack tecnológico

- **React 19** + **TypeScript 5**
- **Vite 6** como build tool
- **Tailwind CSS 3.4** con design tokens personalizados
- **TanStack Query 5** para gestión de estado del servidor
- **Zustand 5** para estado local
- **React Router 7** con lazy loading
- **Zod** para validación de esquemas
- **Lucide React** para iconografía
- **Fuentes auto-hospedadas**: Inter (UI) y JetBrains Mono (código)

## Desviaciones del plan

- Se mantiene Tailwind 3.4 (el plan original mencionaba Tailwind 4, pero el scaffold existente usa v3)
- Estructura de carpetas basada en features (`src/features/`) en vez de domain-driven

## Scripts disponibles

```bash
# Desarrollo (con hot reload)
pnpm dev

# Build de producción
pnpm build

# Preview del build
pnpm preview

# Linting de tipos
pnpm typecheck

# Tests unitarios e integración (Vitest + Testing Library)
pnpm test              # modo watch
pnpm test:run          # modo CI

# Tests E2E (Playwright)
pnpm e2e               # ejecutar tests E2E
pnpm e2e:install       # instalar navegadores (primera vez)

# Formateo y lint
pnpm lint
pnpm format
```

## Estructura del proyecto

```
src/
├── components/         # Componentes compartidos
│   ├── ui/            # Primitivos de UI (Button, Input, etc.)
│   └── domain/        # Componentes de dominio (SpaceCard, etc.)
├── features/          # Páginas organizadas por feature
│   ├── explore/       # Explorador de espacios (S1)
│   ├── availability/  # Consulta de disponibilidad (S2)
│   ├── reservation/   # Asistente de reserva (S3)
│   ├── receipt/       # Recibo de reserva (S4)
│   ├── my-reservations/ # Mis reservas (S5)
│   ├── incidents/     # Reporte de incidentes (S6)
│   ├── help/          # Página de ayuda
│   └── not-found/     # 404
├── hooks/             # Hooks personalizados
├── lib/               # Utilidades puras
├── stores/            # Stores de Zustand
├── styles/            # Estilos globales y tokens
└── types/             # Tipos TypeScript compartidos

e2e/                   # Tests E2E con Playwright
public/                # Assets estáticos
```

## Proxy de API

El servidor de desarrollo de Vite proxya `/api/**` a `http://localhost:3000/**` (API Express). No se requiere configuración adicional, solo ejecutar el backend en el puerto 3000.

## Tests

- **Unitarios e integración**: Vitest con Testing Library, MSW para mocking de API
- **Cobertura**: ~95% en componentes críticos (asistente de reserva, cálculos de pricing)
- **E2E**: Playwright con viewport móvil (360px) y escritorio
- **Accesibilidad**: axe-core integrado en tests de componentes clave

## Notas de implementación

- **Timezone**: Todas las fechas se manejan en `America/Lima` (UTC-5), sin horario de verano
- **Idempotencia**: Cada reserva usa una `Idempotency-Key` que rota solo cuando cambian userId, rol o franja horaria
- **Pricing**: Los factores de descuento (SENIOR ×0.5, PRIVATE_CLUB ×1.2) se replican en el cliente para mostrar el total estimado; el backend confirma el monto final
- **Formato de moneda**: `S/ 0.00 PEN` con separadores locales peruanos
- **Errores**: Los mensajes de error del backend se traducen según el contexto (spaces, availability, reservation, etc.)

## Comandos de verificación

```bash
# Verificar que todo compila y los tests pasan
pnpm typecheck
pnpm test:run
pnpm build
pnpm e2e

# Levantar entorno local (requiere backend corriendo en :3000)
pnpm dev
```

## Accesibilidad

- WCAG 2.1 AA
- Soporte completo para teclado (Tab, Enter, Escape)
- Skip link para saltar al contenido
- Atributos ARIA en componentes interactivos
- Contraste de colores validado con axe-core
- Modo lectura opcional (fuentes más grandes)

## Responsive

- Mobile-first (360px+)
- Bottom nav en móvil, top nav en desktop
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)

## Estado del proyecto

✅ Todas las pantallas implementadas (S1-S6 + ayuda + 404)  
✅ Tests unitarios e integración (49 tests pasando)  
✅ Tests E2E (8 tests pasando en móvil y escritorio)  
✅ Build de producción exitoso  
✅ Typecheck limpio  
✅ Accesibilidad validada con axe-core
