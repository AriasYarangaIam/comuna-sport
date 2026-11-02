# ComunaSport — DESIGN

Especificación de interfaz (UI), experiencia (UX) y sistema de diseño del cliente web de **ComunaSport**,
validada contra el código de `src/` y escrita para ser consumida por **Google Stitch**. Sustituye a
`PRE-DESIGN.md`, que queda como insumo histórico. Idioma de la interfaz: español (Perú).

---

## 0. Veredicto de la propuesta y modo de uso

### 0.1 Veredicto (qué se conserva y qué se corrige)

La propuesta del `PRE-DESIGN.md` es sólida en **modelado de dominio** (personas derivadas de `UserRoleType`,
transparencia tarifaria, ciclo de vida de incidentes) y suficiente como punto de partida visual. Se corrige en
cuatro puntos que, tal como estaban, producían pantallas no implementables:

| # | Problema del borrador | Consecuencia | Corrección en este documento |
| :-- | :--- | :--- | :--- |
| V1 | Paleta fría/oscura (`#0F766E` verde petróleo + ámbar `#F59E0B` sobre fondo humo) | Identidad "municipal gris"; ámbar sobre fondo claro no alcanza contraste AA como texto | Paleta **celeste clara** completa con contrastes medidos (§3.1) |
| V2 | Nombres, precios y horarios de espacios inventados ("Cancha Municipal Norte", 08:00–22:00 para todos) | La UI mentiría sobre el catálogo real y bloquearía horarios válidos | Todo se lee de la API; horarios derivados de `availabilityWindows` por espacio (§6.1) |
| V3 | Botones "Aprobar / Rechazar / Resolver" y "Cancelar reserva" | **No existe endpoint** que los respalde (solo `POST /incidents` y lecturas) | El ciclo de vida se visualiza en solo lectura; se documenta la brecha (§6.3) |
| V4 | Wireframes estáticos, sin estados de carga/vacío/error ni reglas de motion | UI percibida como maqueta, no como producto "dinámico" | Estados por componente, motion tokens y criterios de aceptación por pantalla (§4, §5, §8) |

Detalle completo con evidencia `archivo:línea` en el **Anexo A**.

### 0.2 Cómo usar este documento en Google Stitch

1. Genera **una pantalla por prompt**. Stitch degrada cuando se le pide el flujo completo de golpe.
2. Pega primero el **Prompt 0 (sistema de diseño)** (§11.1) en un proyecto nuevo, tipo *Web*.
3. Pega luego el prompt de la pantalla, en el orden S1 → S6. Cada prompt ya incluye el copy literal en español.
4. Itera con prompts **aditivos**, nunca regenerando: "solo cambia X, conserva todo lo demás".
5. Stitch entrega maqueta + código de referencia: trátalo como andamio visual, no como implementación; el
   cableado a la API está especificado en §6 y no lo produce Stitch.
6. Los bloques ASCII de §5 son **intención de layout**, no artefactos visuales: la fuente de verdad para Stitch
   son los prompts de §11.

Reglas de iteración que evitan resultados inconsistentes:

| Quiero | Prompt correcto | Prompt incorrecto |
| :--- | :--- | :--- |
| Más aire | "Aumenta el espaciado vertical entre tarjetas a 24px, conserva colores y tipografía" | "Hazlo más limpio" |
| Menos ruido | "Elimina la insignia de capacidad y conserva el resto idéntico" | "Simplifica" |
| Coherencia | "Aplica el mismo encabezado de la pantalla anterior a esta" | "Que combine" |

---

## 1. Producto, alcance y principios

**ComunaSport** digitaliza la reserva de espacios deportivos municipales y la denuncia de daños en
infraestructura, con dos promesas medibles: **cero favoritismo** (toda tarifa es explicable en pantalla) y
**auditoría ciudadana** (todo daño reportado es rastreable en su ciclo de vida).

Alcance de esta entrega de diseño: cliente web responsive (mobile-first) sobre la API existente. Sin
autenticación real (los identificadores se ingresan manualmente), sin pagos en línea, sin panel administrativo.

### Principios de diseño

| Principio | Traducción concreta en UI |
| :--- | :--- |
| **Transparencia radical** | Toda cifra monetaria se muestra desglosada (base, factor, total) con el nombre de la regla aplicada. Nunca un total "mágico". |
| **Accesibilidad primero (WCAG 2.1 AA)** | Contraste ≥ 4.5:1 en texto, objetivos táctiles ≥ 48 × 48 px, foco visible, sin dependencia exclusiva del color. |
| **Previsibilidad** | La UI nunca promete una acción que la API no puede cumplir; el estado del servidor manda sobre el cálculo local. |
| **Una acción primaria por pantalla** | Un único botón sólido; el resto son secundarios (contorno) o terciarios (texto). |
| **Dinamismo con propósito** | Movimiento solo para explicar cambio de estado (precio recalculado, sección expandida, resultado enviado). Nada decorativo en bucle salvo el indicador de progreso. |

---

## 2. Personas y matriz de adaptación

Derivadas de `UserRoleType` (`src/domain/value-objects/user-role.vo.ts:1`). La UI **no** bloquea funciones por
rol: adapta énfasis, no permisos.

| Rol | Persona | Necesidad | Adaptación de UI |
| :--- | :--- | :--- | :--- |
| `NEIGHBOR` | Vecino que juega al salir del trabajo | Reservar en < 60 s desde el móvil | Flujo de 3 pasos, CTA fija, hora sugerida "ahora + 1 h" |
| `YOUTH` | Estudiante | Misma tarifa que vecino, reserva rápida en grupo | Igual que `NEIGHBOR` + campo de aforo informativo del espacio |
| `SENIOR` | Adulto mayor (50 % de descuento) | Leer sin esfuerzo y entender su beneficio | Insignia "Beneficio Adulto Mayor −50 %", ahorro en `PEN` visible, **Modo Lectura Fácil** (§9.4) |
| `PRIVATE_CLUB` | Academia o club | Comprobante formal con recargo explicado | Desglose "Recargo solidario +20 % → mantenimiento comunitario" |
| Auditor vecino | Quien reporta daños | Reportar en < 1 min y ver seguimiento | Formulario de 3 campos con contador 0/2000 y tablero de estados |

Escala tipográfica base 16 px; **no** existe una "versión senior" separada de la app: el modo de lectura es un
ajuste voluntario y reversible que cualquier persona puede activar.

---

## 3. Sistema de diseño (design tokens)

### 3.1 Color — identidad celeste clara

Identidad: cielo costero peruano a media mañana, losa municipal limpia, señalética azul. **Celeste = marca**;
el verde/ámbar/rojo se reservan exclusivamente para **estado**. Regla de proporción: 70 % superficie clara,
20 % celeste (estructura, chips, énfasis), 10 % estado semántico.

#### Familia celeste (marca)

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--sky-50` | `#F2F9FF` | Fondo de sección alterna |
| `--sky-100` | `#E3F2FF` | Chips, filas seleccionadas, fondo de insignias |
| `--sky-200` | `#C9E6FE` | Bordes de tarjetas activas, separadores de énfasis |
| `--sky-300` | `#A5D5FB` | Ilustración, gráficos, barra de progreso (riel) |
| `--sky-400` | `#74BEF5` | Barra de progreso (relleno), iconografía decorativa |
| `--sky-500` | `#3FA3E8` | Acento gráfico; **no** usar como texto ni como fondo de texto |
| `--sky-600` | `#1E86C9` | Iconos sobre fondo claro (3.9:1 con blanco, solo ≥ 24 px) |
| `--sky-700` | `#15699E` | **Primario**: botones sólidos, enlaces, foco, pestaña activa (5.9:1 con blanco) |
| `--sky-800` | `#124F77` | Hover/pressed del primario; texto sobre `--sky-100` (7.6:1) |
| `--sky-900` | `#0D3A58` | Encabezados de máximo énfasis, títulos de recibo |

#### Neutrales (azul-slate, no gris puro)

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--canvas` | `#F4FAFF` | Fondo general de la aplicación |
| `--surface` | `#FFFFFF` | Tarjetas, hojas, tablas |
| `--surface-tint` | `#E9F4FD` | Encabezado de tabla, zona de resumen |
| `--border` | `#CDE4F7` | Bordes por defecto |
| `--border-strong` | `#A9BDCD` | Bordes de controles de formulario |
| `--text` | `#0C1F2E` | Texto principal (15.9:1 sobre `--canvas`) |
| `--text-secondary` | `#56718A` | Texto secundario (4.8:1 sobre `--canvas`) |
| `--text-disabled` | `#8FA6B8` | Solo en componentes deshabilitados (no crítico) |

#### Estado semántico (modelo "fondo teñido + texto oscuro")

| Token | Fondo | Texto/borde | Uso | Contraste texto/fondo |
| :--- | :--- | :--- | :--- | :--- |
| `--success` | `#E4F7F1` | `#0E7C63` | Reserva creada (`201`), incidente `RESOLVED` | 4.63:1 ✔ AA |
| `--warning` | `#FFF3E0` | `#9A5B00` | `RESERVATION_CONFLICT`, fuera de horario, `UNDER_REVIEW` | 4.95:1 ✔ AA |
| `--danger` | `#FDECEA` | `#B42318` | Validación `400`/`422`, `REJECTED`, espacio inactivo | 5.75:1 ✔ AA |
| `--info` | `#E3F2FF` | `#124F77` | Ayuda contextual, `APPROVED`, estado neutro informativo | 7.64:1 ✔ AA |

Reglas duras de color:

1. Nunca texto blanco sobre `--sky-400`/`--sky-500` (contraste < 3:1).
2. Ningún estado se comunica solo con color: siempre icono + etiqueta de texto (`Resuelto`, `En revisión`).
3. El ámbar nunca se usa como color de texto sobre blanco (`#F59E0B` daba 2.3:1): aquí el ámbar vive en el fondo
   `--warning` con texto `#9A5B00`.
4. Sombras teñidas de celeste, no grises: `0 1px 2px rgba(12,31,46,.06)`, `0 8px 24px rgba(18,79,119,.10)`.

### 3.2 Tipografía

Fuente: **Inter** (UI y cuerpo, con `font-variant-numeric: tabular-nums` obligatorio en toda cifra monetaria).
Monoespaciada: **JetBrains Mono** para UUID, `Idempotency-Key`, ISO-8601 y códigos de error.

| Rol | Tamaño / interlineado | Peso | Uso |
| :--- | :--- | :--- | :--- |
| Display | 32 / 40 | 600 | Título de pantalla en desktop |
| H1 | 28 / 36 | 600 | Título de pantalla en móvil, total del recibo |
| H2 | 22 / 30 | 600 | Encabezado de sección |
| H3 | 18 / 26 | 600 | Encabezado de tarjeta, paso del asistente |
| Body | 16 / 24 | 400 | Texto general, etiquetas, botones |
| Small | 14 / 20 | 400–500 | Metadatos, ayudas, celdas de tabla |
| Caption | 12 / 16 | 500 | Insignias, contadores, marcas de tiempo (nunca texto crítico) |
| Mono | 14 / 20 | 400 | Identificadores y códigos |

Límite de medida: 68 caracteres por línea en bloques de texto. Nunca texto justificado.

### 3.3 Espaciado, radios, elevación

Escala 4 pt: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Radios: `8` inputs y botones, `12` tarjetas,
`16` hojas y diálogos, `999` píldoras e insignias. Elevación: 3 niveles (reposo, hover/tarjeta activa, hoja
modal). Sin bordes + sombra simultáneos en el mismo componente.

### 3.4 Motion

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--dur-instant` | 120 ms | Cambio de color en hover/foco |
| `--dur-fast` | 180 ms | Aparición de ayuda inline, conteo del precio |
| `--dur-base` | 240 ms | Expansión de sección, cambio de pestaña |
| `--dur-slow` | 320 ms | Hoja modal (móvil), transición de ruta |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Por defecto |
| `--ease-emphasis` | `cubic-bezier(.05,.7,.1,1)` | Entrada de foco y hojas |
| `--ease-exit` | `cubic-bezier(.3,0,.8,.15)` | Salidas |

Reglas: una sola animación de "protagonista" por pantalla; el recálculo del precio se anima como conteo de
números (180 ms) sin mover el layout; `prefers-reduced-motion` sustituye todo desplazamiento por transición de
opacidad de 120 ms; ninguna animación bloquea la interacción.

### 3.5 Breakpoints y grilla

| Nombre | Rango | Grilla | Margen | Navegación |
| :--- | :--- | :--- | :--- | :--- |
| `xs` | 360–479 | 4 col, gutter 16 | 16 | Barra inferior (4 ítems) |
| `sm` | 480–767 | 4 col, gutter 16 | 20 | Barra inferior |
| `md` | 768–1023 | 8 col, gutter 20 | 24 | Barra superior + pestañas |
| `lg` | 1024–1279 | 12 col, gutter 24, máx. 1200 | 24 | Barra superior + pestañas |
| `xl` | ≥ 1280 | 12 col, gutter 24, máx. 1200 | auto | Barra superior + pestañas |

Reglas de conversión: rejillas de 1 columna en `xs/sm`, 2 en `md`, 3–4 en `lg+`. Tablas convierten a tarjetas por
debajo de 1024 px. Altura de viewport siempre `100dvh` (nunca `100vh`). Contenido de barra inferior respeta
`safe-area-inset-bottom`.

### 3.6 Iconografía

Set lineal de 24 px, trazo 1.75, esquinas redondeadas: `fútbol`, `básquet`, `tenis`, `multipropósito`, `calendario`,
`reloj`, `ubicación`, `escudo` (beneficio), `alerta`, `herramienta`, `check`, `x`, `flecha`. Icono siempre
acompañado de etiqueta de texto; nunca icono solo como única señal de un estado crítico.

---

## 4. Inventario de componentes

Cada componente se especifica con: anatomía, estados obligatorios y regla de accesibilidad. Stitch debe verlos
en su contexto de pantalla, no en un catálogo aparte.

| Componente | Anatomía | Estados obligatorios | Accesibilidad |
| :--- | :--- | :--- | :--- |
| `AppShell` | Barra superior (marca + pestañas) / barra inferior (móvil) + `<main>` | ruta activa, menú colapsado | `role="banner"`, `role="navigation"`, enlace "Saltar al contenido" |
| `SpaceCard` | Insignia de tipo · nombre · estado · capacidad · tarifa base · ventana horaria · 2 acciones | activo, inactivo (gris + deshabilitado), cargando (skeleton) | Título en `h3`; estado textual; acciones deshabilitadas con `aria-disabled` + motivo |
| `StatusBadge` | Icono + etiqueta sobre fondo teñido | 4 estados de incidente + activo/inactivo | Texto real, no solo color |
| `Stepper` | 3 pasos: Identificación → Categoría → Horario, con resumen | paso actual, completado, con error | `aria-current="step"`, foco al encabezado del paso al avanzar |
| `RoleSelector` | 4 tarjetas-radio con icono, nombre, factor y precio resultante | seleccionado, no seleccionado, foco | `fieldset`/`legend`, `input[type=radio]` real |
| `TimeSlotPicker` | Fecha + hora inicio + hora fin, con validación cruzada | válido, inválido (inline), fuera de ventana, sugerencia | Errores vinculados con `aria-describedby`, nunca solo borde rojo |
| `PriceSummary` | Base, factor con nombre de la estrategia, descuento/recargo, total | calculando, listo, error de cálculo | `aria-live="polite"` al recalcular; sin `aria-live` en cada tecla |
| `ReservationReceipt` | Código mono, espacio, franja, total, `isActive`, aviso de notificación | emitido | Encabezado `h2`, código copiable con botón |
| `IncidentTimeline` | Riel vertical con 4 nodos y marca de tiempo | estado actual, estado futuro (atenuado), terminal | Orden semántico en lista, no en divs posicionados |
| `InlineAlert` | Icono, título, cuerpo, acción opcional | info, warning, danger, success | `role="alert"` solo para error; `role="status"` para confirmación |
| `Toast` | Mensaje breve + acción "Deshacer/Ver" | info, error, éxito | Máximo 1 visible, 6 s, pausable al enfocar |
| `Sheet` (móvil) / `Dialog` (desktop) | Cabecera con cierre, cuerpo desplazable, CTA fija | abierto, cerrando | Trampa de foco, `Esc`, retorno de foco al disparador |
| `EmptyState` | Ilustración celeste, título, explicación, acción | sin resultados, sin reservas, sin reportes | Nunca un vacío mudo: siempre acción siguiente |
| `Skeleton` | 3 bloques con brillo celeste | carga | `aria-busy="true"` en el contenedor, sin anuncios repetidos |
| `DevInspector` | Cajón lateral: idempotencia, feed de eventos | cerrado, abierto | Solo en entorno de demo; oculto a lectores de pantalla en producción |

---

## 5. Pantallas

Convención: cada pantalla declara objetivo, datos (endpoint real), anatomía, comportamiento responsive, estados y
microcopy literal. Los prompts de §11 son la versión que consume Stitch.

### S1 · Explorar espacios

**Objetivo:** responder "¿qué puedo reservar hoy y a qué precio?" sin iniciar sesión.
**Datos:** `GET /spaces` → `SpaceResponseDto[]` (`name`, `type`, `capacity`, `basePrice{amount,currency}`,
`isActive`, `availabilityWindows[]`). Filtro por tipo es **local** (no hay query param).

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ComunaSport          Explorar · Mis reservas · Incidentes        [Ayuda]     │  ← md+
├──────────────────────────────────────────────────────────────────────────────┤
│ Espacios deportivos de tu comuna                                             │
│ Consulta disponibilidad real y tarifas públicas. Sin registro.               │
│                                                                              │
│ (Todos)  ⚽ Fútbol   🏀 Básquet   🎾 Tenis   🏃 Multipropósito                 │  ← filtros píldora
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌───────────────────────────────┐         │
│ │ ⚽ FÚTBOL          ● Activo   │  │ 🏀 BÁSQUET        ● Activo    │         │
│ │ Cancha de Veteranos Miraflores│  │ Losas Comunitarias Barranco   │         │
│ │ Aforo 22 personas             │  │ Aforo 10 personas             │         │
│ │ S/ 100.00 PEN por bloque      │  │ S/ 40.00 PEN por bloque       │         │
│ │ Hoy 08:00–22:00               │  │ Hoy 07:00–21:00               │         │
│ │ [Ver horarios y reservar]     │  │ [Ver horarios y reservar]     │         │
│ │  ⚠ Reportar un daño           │  │  ⚠ Reportar un daño           │         │
│ └───────────────────────────────┘  └───────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
```

```text
Móvil (xs) — una tarjeta por fila, sin barra superior de pestañas
┌──────────────────────────────┐
│ ComunaSport          [☰]     │
│ Espacios de tu comuna        │
│ (Todos) ⚽ 🏀 🎾 🏃 ← desplaz.│
│ ┌──────────────────────────┐ │
│ │ ⚽ FÚTBOL      ● Activo   │ │
│ │ Cancha de Veteranos...   │ │
│ │ Aforo 22 · S/ 100.00 PEN │ │
│ │ Hoy 08:00–22:00          │ │
│ │ [Ver horarios]           │ │  ← ancho completo
│ │ ⚠ Reportar un daño       │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [Explorar][Reservas][⚠][Ayuda]│ ← barra inferior fija
└──────────────────────────────┘
```

- El precio mostrado es la **tarifa base** con la etiqueta "por bloque", sin factor de rol (el rol se elige en S3).
- Espacio inactivo: tarjeta en escala de grises con `--danger` de borde, etiqueta "En mantenimiento", acciones
  deshabilitadas y texto emergente "Este espacio está fuera de servicio temporalmente".
- Nunca se muestra "aforo disponible": la API no controla ocupación por franja, solo detecta solapamiento.

**Responsive:** 1 col `xs/sm`, 2 col `md`, 3 col `lg`, 4 col `xl`. Filtros como píldoras con desplazamiento
horizontal y `scroll-snap` en `xs` (sin scroll de página).

**Estados:** carga = 4 skeletons de tarjeta; vacío de filtro = "No hay espacios de este tipo en tu comuna" +
botón "Ver todos"; error `500` = `InlineAlert` danger "No pudimos cargar los espacios. Reintentar".

### S2 · Disponibilidad ("¿Cuándo puedo jugar?")

**Objetivo:** convertir "quiero jugar el sábado a las 10" en una lista de espacios libres, sin adivinar.
**Datos:** `GET /spaces/availability?start=<ISO>&end=<ISO>` → `SpaceResponseDto[]` (solo los libres).

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Volver   ¿Cuándo quieres jugar?                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Fecha   [ 2026-10-24 ▾ ]        Duración  (1 h) (2 h) (3 h)                  │
│                                                                              │
│ 08:00 09:00 10:00 11:00 12:00 13:00 ... 22:00   ← franjas, 6 visibles        │
│  ▁▁▁▁  ▁▁▁▁  ▓▓▓▓  ░░░░  ...                                                │
│                                                                              │
│ Resultado para 10:00–12:00 (2 h)                                             │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏀 Losas Comunitarias Barranco · S/ 40.00 PEN · S/ 20.00/hora            │ │
│ │                                        [Reservar este bloque]            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ La disponibilidad es informativa. El servidor valida el solapamiento al   │
│   confirmar: si otro vecino se adelanta, te lo avisamos al instante.         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Cada franja visible es **una llamada** a `/spaces/availability`; se muestran como máximo 6 franjas y se cachea
  por `(fecha, franja)` durante 60 s para respetar el límite de 100 peticiones / 15 min
  (`rate-limit.middleware.ts:4-9`).
- El chip "libre/ocupado" es el resultado del servidor, jamás un cálculo local.
- Si el usuario no elige nada, la franja sugerida es "hoy + 1 hora" redondeada a la hora siguiente, dentro de la
  ventana del espacio.

**Estados:** cargando franjas = píldoras con skeleton; sin resultados = "No hay espacios libres en ese bloque" +
"Ver todo el día"; `400 BAD_REQUEST` (fechas inválidas) = alerta con "Revisa la fecha y la duración".

### S3 · Asistente de reserva (3 pasos, hoja en móvil)

**Objetivo:** completar `POST /spaces/:id/reservations` explicando el precio antes de confirmar.
**Datos de entrada:** `userId` (texto libre, mín. 1), `role` (enum), `timeSlot.start/end` (ISO-8601),
cabecera `Idempotency-Key` (obligatoria).

```text
Móvil — hoja a pantalla completa                          Desktop — diálogo 640 px
┌────────────────────────────────────┐                    ┌──────────────────────────┐
│ ✕  Reservar · Cancha de Veteranos  │                    │ Reservar · Cancha...   ✕ │
│ ● ● ○   1 Identificación           │                    │ ● ● ○                   │
├────────────────────────────────────┤                    ├──────────────────────────┤
│ Identifícate para tu reserva       │                    │ (mismo contenido, 2 col) │
│ ID de usuario o DNI                │                    │                          │
│ [ user-vecino-4589          ]      │                    │                          │
│ ⓘ No es una cuenta: identifica tu  │                   │                          │
│   reserva en el comprobante.       │                    │                          │
│                                    │                    ├──────────────────────────┤
│ ┌────────────────────────────────┐ │                    │ Resumen de tarifa        │
│ │ Precio base       S/ 100.00    │ │                    │ Base           S/ 100.00 │
│ │ Total estimado    S/ 100.00    │ │                    │ Total          S/ 100.00 │
│ └────────────────────────────────┘ │                    │                          │
├────────────────────────────────────┤                    │ [Continuar]              │
│ [Continuar]  ← CTA fija, 48 px     │                    └──────────────────────────┘
└────────────────────────────────────┘
```

**Paso 2 — Categoría comunitaria (tarjeta-radio):**

| Opción | Icono | Etiqueta | Factor | Precio para base S/ 100.00 |
| :--- | :--- | :--- | :--- | :--- |
| `NEIGHBOR` | 🏠 | Vecino general | ×1.0 | S/ 100.00 |
| `YOUTH` | 🎓 | Joven / estudiante | ×1.0 | S/ 100.00 |
| `SENIOR` | 👴 | **Adulto mayor · Beneficio −50 %** | ×0.5 | S/ 50.00 |
| `PRIVATE_CLUB` | 🏆 | Club privado · Recargo solidario +20 % | ×1.2 | S/ 120.00 |

**Paso 3 — Franja horaria + resumen final:**

```text
┌──────────────────────────────────────────────────────────────┐
│ Fecha      [ 2026-10-24 ]                                    │
│ Inicio     [ 10:00 ▾ ]      Fin [ 12:00 ▾ ]                  │
│ Ventana del espacio: hoy 08:00–22:00 · misma fecha           │
│                                                              │
│ ┌── Resumen de tarifa ─────────────────────────────────────┐ │
│ │ Precio base del espacio                    S/ 100.00 PEN │ │
│ │ Beneficio Adulto Mayor (−50 %)            −S/  50.00 PEN │ │
│ │ ──────────────────────────────────────────────────────── │ │
│ │ TOTAL A PAGAR                              S/  50.00 PEN │ │
│ └──────────────────────────────────────────────────────────┘ │
│ 🔒 Referencia de operación: 9b1deb4d…cb6d  (mono, 12 px)     │
│                                                              │
│ [Atrás]                          [Confirmar reserva]         │
└──────────────────────────────────────────────────────────────┘
```

Reglas de UX conectadas al dominio:

1. **Precio en vivo:** al cambiar de rol, `PriceSummary` recalcula `base × factor` con redondeo a 2 decimales
   (idéntico a `Cost.fromCalculation`, `cost.vo.ts:11-14`) y anuncia el nuevo total con `aria-live="polite"`.
   El nombre de la regla se muestra siempre ("Beneficio Adulto Mayor (−50 %)").
2. **Validación preventiva de franja:** `fin > inicio` y ambos en el mismo día calendario **de America/Lima**
   (`time-slot.vo.ts:19-20`); la UI además restringe las opciones de hora a la `availabilityWindows` del espacio
   (`space.entity.ts:80-84`) para no ofrecer lo que el servidor rechazará.
3. **Idempotencia visible:** la "referencia de operación" es la `Idempotency-Key` vigente. Se rota **solo** al
   abrir el asistente o al cambiar `userId`, `role` o `timeSlot`; un reintento o doble toque reutiliza la misma
   llave (§6.2).
4. **Un solo CTA sólido por paso**; "Atrás" siempre secundario y nunca descarta datos ya ingresados.
5. Al confirmar: botón pasa a estado "Procesando…" con spinner y `aria-busy`, y se bloquea el doble envío en el
   cliente (el servidor también lo bloquea).

**Estados:** validación inline por campo; `409 RESERVATION_CONFLICT` → `Dialog` de conflicto con franjas
alternativas sugeridas; `409 IDEMPOTENCY_CONFLICT in_flight` → botón en "Procesando, espera…" sin cambiar de
pantalla; `422 payload_mismatch` → alerta "Detectamos un cambio en los datos. Renovamos tu operación, confirma
nuevamente" + rotación silenciosa de la llave.

### S4 · Recibo digital

**Objetivo:** dar certeza inmediata tras `201 Created` (`ReservationResponseDto`).

```text
┌──────────────────────────────────────────────────────────────┐
│ ✅ Reserva confirmada                                        │
│                                                              │
│ Cancha de Veteranos Miraflores                               │
│ Sábado 24 de octubre · 10:00–12:00 (America/Lima)            │
│                                                              │
│ Precio base                        S/ 100.00                 │
│ Beneficio Adulto Mayor (−50 %)     −S/  50.00                │
│ TOTAL                              S/  50.00 PEN             │
│                                                              │
│ Código de reserva                                            │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 7f3c2b1a-9d4e-4c8b-8a11-2f6e9d0c4b77        [Copiar]     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Estado: ● Activa · Creada el 2026-10-24 09:58 (America/Lima) │
│                                                              │
│ 📧 Enviamos la confirmación por correo y notificación push.   │
│                                                              │
│ [Ver mis reservas]              [Reservar otro horario]      │
└──────────────────────────────────────────────────────────────┘
```

- El nombre del espacio **no viene** en el DTO: se resuelve con el catálogo ya cargado o `GET /spaces/:id`.
- El aviso de notificación es informativo (el `NotificationListener` corre del lado servidor); no debe prometer
  canales configurables por el usuario.
- Botón "Copiar" con confirmación efímera "Copiado" (1.5 s) y `role="status"`.

### S5 · Mis reservas

**Objetivo:** listar y verificar reservas por identificador de usuario.
**Datos:** `GET /users/:userId/reservations` → `ReservationResponseDto[]`; detalle `GET /reservations/:id`.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Mis reservas                                                                 │
│ ID de usuario  [ user-vecino-4589            ]  [Buscar]                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏟 Cancha de Veteranos Miraflores                ● Activa                │ │
│ │ 24 oct 2026 · 10:00–12:00 · S/ 50.00 PEN                                 │ │
│ │ Código 7f3c2b1a…4b77                            [Ver detalle]            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Esta versión no permite cancelar reservas desde la web.                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- No hay endpoint de cancelación: **no** se muestra acción "Cancelar" (§6.3).
- Orden por `createdAt` descendente, calculado en cliente.
- Estado vacío: "Aún no tienes reservas con este identificador" + CTA "Explorar espacios".

### S6 · Incidentes: reportar y seguir

**Objetivo:** reportar un daño en menos de un minuto y mostrar el ciclo de vida del dominio.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Incidentes comunitarios                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ REPORTAR UN DAÑO                                                             │
│ Espacio afectado  [ Cancha de Veteranos Miraflores      ▾ ]                  │
│ Tu identificador  [ vecino-auditor-01                   ]                    │
│ ¿Qué pasó?        ┌──────────────────────────────────────────────────────┐   │
│                   │ Tablero de básquet con fisura en el soporte norte…   │   │
│                   └──────────────────────────────────────────────────────┘   │
│                   23 / 2000 caracteres                                       │
│                                                [Enviar reporte]              │
├──────────────────────────────────────────────────────────────────────────────┤
│ SEGUIMIENTO                                                                  │
│  ● En revisión ──▶ ○ Aprobado ──▶ ○ Resuelto                                 │
│         └────────▶ ○ Rechazado                                               │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ #f7e8d9c0… · Cancha de Veteranos Miraflores     [● En revisión]          │ │
│ │ "Vidrio rajado en la pared norte, cerca de la entrada."                  │ │
│ │ Reportó vecino-auditor-01 · 21 oct 2026, 15:00                           │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Formulario de 3 campos: `spaceId` (select alimentado por `GET /spaces`), `reporterId` (libre, mín. 1),
  `description` (mín. 1, máx. 2000 → contador `n / 2000`, `maxlength=2000`, recorte de espacios al enviar).
- El riel de estados es **solo lectura** e informativo: la API no expone transiciones (§6.3). El nodo actual se
  marca con `aria-current="step"`; los futuros se atenúan; `REJECTED` es terminal y se rotula como tal.
- Listado: `GET /spaces/:id/incidents` cuando hay espacio seleccionado; detalle con `GET /incidents/:id`.
- Tras `201`: la tarjeta del nuevo reporte entra arriba con animación de 240 ms y foco en su encabezado.

**Estados:** `404 SPACE_NOT_FOUND` (espacio eliminado del catálogo) → alerta "El espacio ya no existe"; `400`
validación → mensaje inline bajo el campo; espacio inactivo → el select lo muestra deshabilitado con la nota "En
mantenimiento, no recibe reportes"; sin reportes → vacío "Sin reportes para este espacio".

### S7 · Inspector técnico (opcional, solo demo académica)

Cajón lateral derecho (`DevInspector`), colapsado por defecto, activado por un botón discreto "Modo demo" en el
pie. Contenido: probador de idempotencia ("Simular doble clic", "Simular reintento con datos distintos") y feed de
eventos (`ReservationConfirmed`). Visible solo en entorno de demostración; oculto en producción y para lectores de
pantalla. No forma parte de los prompts de Stitch (no aporta al diseño visual evaluado).

---

## 6. Contratos de datos UI ↔ API (validado contra `src/`)

### 6.1 Endpoints disponibles

| Método y ruta | Respuesta | Uso en UI |
| :--- | :--- | :--- |
| `GET /spaces` | `SpaceResponseDto[]` | S1, selects de S3/S6 |
| `GET /spaces/:id` | `SpaceResponseDto` | Detalle, resolver nombre en S4 |
| `GET /spaces/availability?start&end` | `SpaceResponseDto[]` libres | S2 (franjas) |
| `POST /spaces/:id/reservations` + `Idempotency-Key` | `201 ReservationResponseDto` | S3, S4 |
| `GET /reservations/:id` | `ReservationResponseDto` | Detalle de S5 |
| `GET /users/:userId/reservations` | `ReservationResponseDto[]` | S5 |
| `POST /incidents` | `201 IncidentResponseDto` | S6 (reporte) |
| `GET /incidents/:id` | `IncidentResponseDto` | Detalle de S6 |
| `GET /spaces/:id/incidents` | `IncidentResponseDto[]` | Listado de S6 |

Campos que la UI **debe** respetar tal cual: `basePrice.amount` es numérico (no formateado), `basePrice.currency`
es `'PEN'`, `cost.amount` ya viene redondeado por el servidor, `availabilityWindows[].start/end` son ISO-8601 UTC,
`reservation.isActive` es booleano y `incident.state` es una cadena del conjunto
`UNDER_REVIEW | APPROVED | REJECTED | RESOLVED`.

### 6.2 Ciclo de la `Idempotency-Key`

1. Se genera `crypto.randomUUID()` al abrir el asistente y cada vez que cambian `userId`, `role` o `timeSlot`.
2. "Confirmar", reintento por red y doble toque envían **la misma** llave.
3. Se rota después de `201` o tras `422 payload_mismatch`. Nunca antes.
4. La llave se muestra truncada, en mono, como "referencia de operación"; es evidencia de transparencia, no un
   dato para memorizar.

Contrato del servidor que la UI debe reflejar sin reinterpretarlo (`idempotency.middleware.ts:45,63,73`):

| Situación | Respuesta | Lo que ve el usuario |
| :--- | :--- | :--- |
| Sin cabecera | `400 MISSING_IDEMPOTENCY_KEY` | Error de integración (no del usuario): "No pudimos preparar tu solicitud. Recarga la página" |
| Misma llave, mismo cuerpo, en curso | `409 IDEMPOTENCY_CONFLICT` (`in_flight`) | Botón "Procesando, espera…" (bloqueo suave) |
| Misma llave, cuerpo distinto | `422 IDEMPOTENCY_CONFLICT` (`payload_mismatch`) | "Detectamos un cambio en los datos. Renovamos tu operación" |
| Misma llave, mismo cuerpo, ya completado | `2xx` replay con el mismo cuerpo | Se muestra el recibo original (idéntico `id`) |

### 6.3 Brechas de la API que la UI no debe disimular

| Función imaginada en el borrador | Estado real | Decisión de UI |
| :--- | :--- | :--- |
| Aprobar / Rechazar / Resolver incidente | El agregado lo permite (`incident.entity.ts:74-84`), **sin ruta HTTP** | Riel de estados en solo lectura + nota "La gestión la realiza el municipio" |
| Cancelar reserva | No existe `DELETE`/`PATCH` en `reservation.routes.ts` | Sin botón "Cancelar"; se informa en S5 |
| Aforo disponible por franja | Solo se detecta solapamiento de franjas, no ocupación | Se muestra `capacity` como dato del espacio, nunca como "lugares libres" |
| Paginación / búsqueda de espacios | `GET /spaces` devuelve todo | Filtro y orden en cliente; sin paginador |
| Notificaciones configurables | Evento del lado servidor (`NotificationListener`) | Aviso informativo, sin interruptores |

### 6.4 Regla de zona horaria (crítica)

El negocio valida el día calendario en **America/Lima** (`time-slot.vo.ts:1,19-20`), no en UTC ni en la zona del
dispositivo. Regla obligatoria del cliente:

1. La persona elige `YYYY-MM-DD` y `HH:mm` → se construye el instante como hora de pared de `America/Lima`
   (UTC−5, sin horario de verano) y se serializa con `toISOString()`.
2. Toda fecha mostrada se formatea con `Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', ... })`.
3. Prohibido `new Date('2026-10-24T10:00:00')` (interpreta la zona del dispositivo) y prohibido aplicar
   `toISOString()` sobre una hora de pared local sin conversión: después de las 19:00 en Lima el día UTC cambia y
   la reserva se rechaza con `slot must be within the same calendar`.
4. Ejemplo canónico: `24 oct 2026 10:00–12:00 Lima` → `start=2026-10-24T15:00:00.000Z`,
   `end=2026-10-24T17:00:00.000Z`.

---

## 7. Matriz de errores → componentes

Formato uniforme del backend: `{ "error": { "code", "message", "details? } }`
(`error-handler.middleware.ts:7-15`). El cliente traduce **código**, nunca el `message` técnico.

| HTTP | `error.code` | Componente | Texto para el ciudadano |
| :--- | :--- | :--- | :--- |
| 400 | `MISSING_IDEMPOTENCY_KEY` | `InlineAlert` danger | "No pudimos preparar tu solicitud. Recarga la página e intenta otra vez." |
| 400 | `BAD_REQUEST` (`slot end must be after start`) | Error inline en hora fin | "La hora de fin debe ser posterior a la de inicio." |
| 400 | `BAD_REQUEST` (`slot must be within the same calendar`) | Error inline bajo la fecha | "El inicio y el fin deben ser el mismo día." |
| 400 | `BAD_REQUEST` (franja fuera de ventana) | `InlineAlert` warning | "Ese horario está fuera del horario de atención de este espacio." |
| 400 | `BAD_REQUEST` (validación Zod de campos) | Error inline por campo | Según campo: "Ingresa tu identificador", "Describe el daño (máximo 2000 caracteres)". |
| 400 | `BAD_REQUEST` (`cannot file incident on inactive space`) | `InlineAlert` warning | "Este espacio está fuera de servicio: no admite reportes en este momento." |
| 404 | `SPACE_NOT_FOUND` (también al reservar en un espacio **inactivo**) | `EmptyState` + redirección | "Ese espacio ya no está disponible. Vuelve al explorador." |
| 404 | `INCIDENT_NOT_FOUND` / `RESERVATION_NOT_FOUND` | `EmptyState` | "No encontramos ese registro. Puede haber expirado." |
| 409 | `RESERVATION_CONFLICT` | `Dialog` de conflicto con alternativas | "Otro vecino tomó ese horario hace un momento. Elige otro bloque disponible." |
| 409 | `IDEMPOTENCY_CONFLICT` (`in_flight`) | Botón bloqueado con spinner | "Tu reserva ya se está procesando. Espera unos segundos." |
| 422 | `IDEMPOTENCY_CONFLICT` (`payload_mismatch`) | `InlineAlert` warning | "Detectamos un cambio en los datos de tu reserva. Renovamos tu operación: confirma nuevamente." |
| 422 | `STATE_TRANSITION_INVALID` | `StatusBadge` bloqueada + tooltip | "Este incidente ya fue cerrado o rechazado; su estado no puede cambiar." |
| 429 | `RATE_LIMIT_EXCEEDED` | `InlineAlert` warning, sin reintento automático | "Hiciste muchas consultas seguidas. Espera unos minutos y vuelve a intentar." |
| 500 | `INTERNAL_ERROR` | `InlineAlert` danger | "Algo falló de nuestro lado. Tu reserva no se cobró. Reintenta en un momento." |

Reglas transversales: un error de red (`fetch` rechazado) nunca se muestra como error del servidor; se ofrece
"Reintentar" explícito; ningún error repite el `message` en inglés del backend.

Códigos inexistentes que el borrador suponía: `SPACE_INACTIVE` y `SPACE_INACTIVE_FOR_INCIDENT` **no existen**.
Un espacio inactivo se manifiesta de dos formas distintas y la UI debe resolverlo sin leer el `message` técnico:

| Intento | Respuesta real | Cómo decide la UI |
| :--- | :--- | :--- |
| Reservar en espacio inactivo | `404 SPACE_NOT_FOUND`, `message: "space is inactive: <id>"` | Si el `spaceId` existe en el catálogo con `isActive: false` → "Espacio en mantenimiento"; si no existe → "ya no está disponible" |
| Reportar daño en espacio inactivo | `400 BAD_REQUEST`, `message: "cannot file incident on inactive space"` | Igual: decidir por `isActive` del catálogo, no por el texto |

---

## 8. Responsividad

1. **Mobile-first real:** se diseña a 360 px y se expande. Ningún dato crítico depende de `hover`.
2. **Navegación:** barra inferior fija de 4 ítems en `xs/sm` (Explorar, Mis reservas, Incidentes, Ayuda) con
   etiqueta visible; barra superior con pestañas desde `md`.
3. **CTA principal:** en S3, fija al borde inferior en `xs/sm` (zona del pulgar, sobre `safe-area-inset-bottom`),
   dentro del flujo en `md+`.
4. **Objetivos táctiles:** mínimo 48 × 48 px con 8 px de separación; radios de tarjeta-radio completos.
5. **Tablas → tarjetas:** cualquier vista tabular se convierte en lista de tarjetas por debajo de 1024 px.
6. **Diálogos → hojas:** en `xs/sm` la reserva es una hoja a pantalla completa con cierre y gesto de arrastre; en
   `md+` un diálogo centrado de 640 px.
7. **Sin scroll horizontal** en ningún breakpoint a 200 % de zoom. Contenedores con `min-width: 0` en flex/grid.
8. **Imágenes/ilustraciones:** `max-width: 100%`, `aspect-ratio` fijo para evitar saltos de layout.
9. **Textos:** nunca truncar un mensaje de error; sí truncar nombres de espacio con `title` completo y línea
   secundaria expandible.
10. **Alto contraste y modo lectura** aplican en todos los breakpoints sin romper la grilla.

---

## 9. UX y accesibilidad (verificación de "intuitiva y dinámica")

### 9.1 Correspondencia con heurísticas de usabilidad

| Heurística | Decisión concreta |
| :--- | :--- |
| Visibilidad del estado | Spinner + texto en cada operación; `aria-busy`; skeletons en carga inicial |
| Lenguaje del usuario | "Bloque", "franja", "losa", "vecino", "beneficio"; código de dominio solo en el modo demo |
| Control y libertad | Atrás sin pérdida de datos; cerrar hoja pide confirmación solo si hay datos; `Esc` cierra |
| Consistencia | Un solo componente de insignia, un solo patrón de error, un solo CTA sólido por pantalla |
| Prevención de errores | Horas restringidas a la ventana del espacio; fin > inicio; `maxlength`; validación al salir del campo |
| Reconocer antes que recordar | Resumen de tarifa siempre visible en S3; la llave de idempotencia se muestra, no se memoriza |
| Eficiencia | Sugerencia "hoy + 1 h"; filtros locales instantáneos; reutilización del catálogo cargado |
| Estética minimalista | Máximo 2 niveles de énfasis por tarjeta; sin sombras dobles; sin degradados salvo el lavado celeste del hero |
| Recuperación de errores | Cada error dice qué pasó y qué hacer; conflicto de horario ofrece alternativas reales |
| Ayuda contextual | Microcopy de una línea bajo campos ambivalentes ("No es una cuenta…") |

### 9.2 Accesibilidad obligatoria

- Contraste: texto normal ≥ 4.5:1, texto grande ≥ 3:1, elementos no textuales ≥ 3:1 (tokens de §3.1 ya cumplen).
- Foco visible: anillo `2 px` `--sky-700` con `offset 2 px` en todos los interactivos; nunca `outline: none`
  sin sustituto.
- Estructura: `header`/`nav`/`main`/`footer`, un `h1` por pantalla, jerarquía sin saltos.
- Formularios: `<label for>` siempre; errores con `aria-describedby` + `aria-invalid`; resumen de errores con foco
  al primer campo inválido.
- Anuncios: `role="alert"` para errores, `role="status"` para confirmaciones y recálculo de precio.
- Teclado: orden lógico, `Tab` no atrapado fuera de diálogos, `Shift+Tab` reversible, `Esc` cierra hojas.
- Hojas y diálogos: foco inicial en el encabezado, trampa de foco, retorno al disparador al cerrar.
- Movimiento: `prefers-reduced-motion: reduce` → solo opacidad; `prefers-contrast: more` → bordes a
  `--sky-800` y texto a `--text` con fondo `#FFFFFF`.
- Idioma: `<html lang="es-PE">`; fechas y montos con `Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' })`.

### 9.3 Pruebas de aceptación de UX

1. Reservar en móvil de 360 px en ≤ 5 interacciones desde S1.
2. Un usuario nuevo completa la reserva sin leer ayuda externa (prueba de 5 personas).
3. Con teclado: alcanzar y confirmar una reserva completa sin ratón.
4. Con lector de pantalla: el flujo anuncia paso, errores y total recalculado.
5. A 200 % de zoom: sin scroll horizontal y sin texto cortado en S1, S3, S6.
6. Doble toque en "Confirmar" produce **una** reserva (verificable por el mismo `id`).

### 9.4 Modo Lectura Fácil (opcional, recomendado)

Interruptor "Lectura fácil" en la barra (icono `Aa`), persistido en `localStorage`, aplicado como
`<html data-reading="large">`: base 18 px / 28, cuerpo en peso 500, objetivos táctiles 56 px, ocultamiento de
metadatos no esenciales (UUID en mono, contadores). No restringe funciones. Estado por defecto: apagado.

---

## 10. Microcopy (es-PE)

| Concepto | Texto canónico | Prohibido |
| :--- | :--- | :--- |
| Recurso reservable | "bloque" o "franja horaria" | "slot", "timeslot" |
| Persona que reserva | "vecino" / "vecina" | "usuario final", "cliente" |
| Descuento senior | "Beneficio Adulto Mayor (−50 %)" | "descuento senior", "promo" |
| Recargo club | "Recargo solidario (+20 %)" | "impuesto", "fee" |
| Incidente | "reporte de daño" | "ticket", "issue" |
| Estado `UNDER_REVIEW` | "En revisión" | "Pendiente" |
| Estado `APPROVED` | "Aprobado" | "Validado" |
| Estado `REJECTED` | "Rechazado (cerrado)" | "Denegado" |
| Estado `RESOLVED` | "Resuelto" | "Completado" |
| Moneda | `S/ 50.00 PEN` | "50 soles", "S/.50" |

Tono: directo, sin jerga técnica, sin signos de admiración dobles, sin culpar al usuario. Las cifras siempre con
dos decimales y `tabular-nums`.

Fechas: `24 oct 2026 · 10:00–12:00` (formato compacto) y `Sábado 24 de octubre de 2026` en encabezados.

---

## 11. Prompts para Google Stitch

> Cada bloque es autónomo y se pega completo. El orden importa: 11.1 una vez, luego 11.2–11.7 en orden.

### 11.1 Prompt 0 — Sistema de diseño (pegar primero)

```text
Diseña un sistema visual para una web app cívica de reserva de espacios deportivos municipales en Perú.
Estilo: claro, aireado, confiable, institucional pero cálido. Identidad CELESTE (azul cielo costero), no verde,
no gris corporativo oscuro. Sin modo oscuro, sin degradados salvo un lavado celeste muy suave detrás del hero.

COLORES (usar exactamente estos hex):
- Fondo de app #F4FAFF ; superficie/tarjetas #FFFFFF ; tinte de superficie #E9F4FD
- Bordes #CDE4F7 ; borde de control #A9BDCD
- Celeste marca: 100 #E3F2FF, 200 #C9E6FE, 300 #A5D5FB, 400 #74BEF5, 500 #3FA3E8, 600 #1E86C9,
  700 #15699E (primario: botones sólidos, enlaces, foco), 800 #124F77 (hover), 900 #0D3A58 (títulos fuertes)
- Texto #0C1F2E ; texto secundario #56718A
- Éxito fondo #E4F7F1 texto #0E7C63 ; Advertencia fondo #FFF3E0 texto #9A5B00 ;
  Peligro fondo #FDECEA texto #B42318 ; Info fondo #E3F2FF texto #124F77
Regla: texto blanco solo sobre #15699E o #124F77. Nunca texto blanco sobre #74BEF5 o #3FA3E8.

TIPOGRAFÍA: Inter. Base 16px/24. Títulos 28/36 y 22/30 semibold. Pequeño 14/20. Insignias 12/16.
Toda cifra monetaria con números tabulares.

FORMAS: radios 12px en tarjetas, 8px en botones e inputs, 16px en hojas modales, píldoras en insignias y filtros.
Sombras teñidas de azul: 0 1px 2px rgba(12,31,46,.06) y 0 8px 24px rgba(18,79,119,.10). Espaciado en múltiplos de 4.

COMPONENTES BASE: barra superior con marca "ComunaSport" y pestañas Explorar / Mis reservas / Incidentes;
barra inferior de navegación en móvil con los mismos 4 destinos; tarjeta de espacio deportivo; insignia de estado
(icono + etiqueta, nunca solo color); botón primario sólido celeste 700, secundario con borde, terciario de texto;
campos con etiqueta arriba y ayuda de una línea; alertas con fondo teñido y borde lateral de 4px.

LAYOUT: móvil 360px con margen 16px, una columna; tablet 768px con 2 columnas; escritorio 1280px con 3 columnas,
ancho máximo 1200px. Objetivos táctiles mínimos 48x48px. Nunca scroll horizontal.

Idioma del copy: español de Perú. Tipografía y números muy legibles (hay personas adultas mayores).
```

### 11.2 Prompt S1 — Explorar espacios (web, 1280 px)

```text
Genera una pantalla web de escritorio (1280px) llamada "Explorar" con el sistema de diseño celeste ya definido.

Estructura de arriba hacia abajo:
1. Barra superior blanca con borde inferior #CDE4F7: logotipo textual "ComunaSport" en semibold, pestañas
   "Explorar" (activa, texto #15699E con subrayado de 3px), "Mis reservas", "Incidentes", y a la derecha un botón
   terciario "Ayuda".
2. Encabezado de sección sobre fondo #F4FAFF: título "Espacios deportivos de tu comuna" (28px semibold) y
   subtítulo "Consulta disponibilidad real y tarifas públicas. Sin registro." (#56718A).
3. Fila de filtros tipo píldora: "Todos" seleccionado (fondo #E3F2FF, texto #124F77, borde #C9E6FE), luego
   "Fútbol", "Básquet", "Tenis", "Multipropósito" con iconos lineales y fondo blanco.
4. Grilla de 3 tarjetas de espacio, separación 24px. Cada tarjeta: fondo blanco, borde #CDE4F7, radio 12px,
   padding 20px, sombra suave. Dentro: fila superior con insignia de tipo (icono + "FÚTBOL") e insignia de estado
   "Activo" (punto verde #0E7C63 sobre #E4F7F1); nombre del espacio en 18px semibold; metadatos en 14px
   "#56718A": "Aforo 22 personas", "S/ 100.00 PEN por bloque", "Hoy 08:00–22:00"; botón primario de ancho completo
   "Ver horarios y reservar" (#15699E, texto blanco, radio 8px, alto 48px); debajo, enlace terciario con icono de
   alerta "Reportar un daño".
   Tarjetas: "Cancha de Veteranos Miraflores" (Fútbol, aforo 22, S/ 100.00 PEN, 08:00–22:00),
   "Losas Comunitarias Barranco" (Básquet, aforo 10, S/ 40.00 PEN, 07:00–21:00),
   "Pista Comunal Barranco" (Tenis, aforo 4, S/ 50.50 PEN, 09:00–23:00).
5. Cuarta tarjeta visible parcialmente al final de la fila: "Multiusos San Isidro" (Multipropósito, aforo 50,
   S/ 150.00 PEN, 06:00–23:00) en estado inactivo: fondo #F4FAFF, borde #FDECEA, texto #56718A, insignia
   "En mantenimiento" (#FDECEA / #B42318), botones deshabilitados en gris con texto "No disponible".

No uses imágenes de stock ni fotos de personas: usa ilustración lineal celeste muy simple o solo iconos.
Mantén mucho aire en blanco y tipografía grande y legible.
```

### 11.3 Prompt S1-móvil — misma pantalla a 360 px

```text
Adapta la pantalla "Explorar" a un móvil de 360px de ancho, mismo sistema de diseño celeste.
- Barra superior más compacta: "ComunaSport" y un botón de menú; sin pestañas visibles.
- Título "Espacios de tu comuna" en 22px semibold.
- Filtros como fila desplazable horizontal de píldoras (se ven 3 y media).
- Una tarjeta por fila, ancho completo, padding 16px, botón primario de ancho completo de 48px de alto.
- Barra de navegación inferior fija de 64px con 4 destinos (Explorar activo en #15699E, Mis reservas, Incidentes,
  Ayuda) con icono arriba y etiqueta de 12px debajo, fondo blanco, borde superior #CDE4F7.
Muestra 2 tarjetas completas y el inicio de la tercera.
```

### 11.4 Prompt S2 — Disponibilidad por franja

```text
Genera una pantalla web "¿Cuándo quieres jugar?" con el sistema de diseño celeste.

De arriba hacia abajo:
1. Cabecera con enlace "Volver" (icono de flecha, terciario) y título "¿Cuándo quieres jugar?" 28px.
2. Barra de filtros: campo "Fecha" con valor "24 oct 2026" (input con icono de calendario), y un grupo de botones
   segmentados "1 h" (inactivo), "2 h" (activo: #15699E blanco), "3 h".
3. Una fila de franjas horarias de 08:00 a 22:00, desplazable, donde cada franja es una píldora de 64px de alto:
   las libres en blanco con borde #C9E6FE y texto #0C1F2E; las ocupadas en #E9F4FD con texto #8FA6B8 y una línea
   diagonal sutil; "10:00" y "11:00" seleccionadas en #E3F2FF con borde #15699E y check.
   Solo se ven 6 franjas a la vez.
4. Título de resultados "Libres para 10:00–12:00 (2 h)" en 18px.
5. Una tarjeta de resultado: icono de básquet, "Losas Comunitarias Barranco", "S/ 40.00 PEN", "S/ 20.00 por
   hora", botón primario alineado a la derecha "Reservar este bloque".
6. Nota informativa al pie con icono "i" y texto: "La disponibilidad es informativa. El servidor valida el
   solapamiento al confirmar: si otro vecino se adelanta, te lo avisamos al instante."
Incluye también un estado alternativo de la lista de resultados vacía con un bloque "No hay espacios libres en ese
bloque" y botón secundario "Ver todo el día".
```

### 11.5 Prompt S3 — Asistente de reserva (3 pasos, móvil)

```text
Genera tres variantes de una hoja (bottom sheet a pantalla completa) de móvil 360px, misma familia celeste.
Cabecera de la hoja: botón ✕ a la izquierda, título "Reservar · Cancha de Veteranos Miraflores", y debajo un
indicador de 3 pasos con círculos y líneas (paso actual #15699E relleno, completado con check, futuro #C9E6FE).
Al pie siempre un botón primario fijo de ancho completo y 48px: "Continuar" o "Confirmar reserva".

Paso 1 "Identificación": etiqueta "Identifícate para tu reserva", input con placeholder "ID de usuario o DNI",
texto de ayuda "No es una cuenta: identifica tu reserva en el comprobante.", y una caja de resumen con fondo
#F4FAFF y borde #C9E6FE: "Precio base S/ 100.00" y "Total estimado S/ 100.00".

Paso 2 "Categoría comunitaria": título "Selecciona tu categoría comunitaria" y subtítulo "El precio se calcula
según tu categoría, de forma pública y transparente". Cuatro tarjetas-radio apiladas, de 64px de alto:
"Vecino general" con factor "×1.0" y precio "S/ 100.00"; "Joven / estudiante" "×1.0" "S/ 100.00";
"Adulto mayor" con insignia destacada "BENEFICIO −50%" (fondo #E3F2FF, texto #124F77) y precio "S/ 50.00";
"Club privado" con texto secundario "Recargo solidario +20%" y precio "S/ 120.00".
La tercera está seleccionada: borde #15699E de 2px, fondo #E3F2FF, check circular a la derecha.

Paso 3 "Franja horaria": campo "Fecha" con "24 oct 2026", dos selects "Inicio 10:00" y "Fin 12:00", nota
"Ventana del espacio: hoy 08:00–22:00 · misma fecha". Debajo, tarjeta "Resumen de tarifa" con filas alineadas a la
derecha con números tabulares: "Precio base del espacio S/ 100.00 PEN", "Beneficio Adulto Mayor (−50 %)
−S/ 50.00 PEN" (en #0E7C63), línea separadora, y "TOTAL A PAGAR S/ 50.00 PEN" en 22px semibold.
Al final, una línea pequeña en monoespaciada: "Referencia de operación: 9b1deb4d…cb6d".
El botón inferior dice "Confirmar reserva". A la izquierda del botón, un enlace secundario "Atrás".
```

### 11.6 Prompt S4 — Recibo de reserva confirmada

```text
Genera una pantalla de confirmación para móvil 360px y otra versión escritorio 640px centrada, sistema celeste.
- Arriba un círculo de éxito 64px con fondo #E4F7F1, check #0E7C63, y el título "Reserva confirmada" en 28px.
- Tarjeta blanca con borde #CDE4F7 que contiene: "Cancha de Veteranos Miraflores" 18px semibold;
  "Sábado 24 de octubre · 10:00–12:00 (America/Lima)" en #56718A; separador; tres filas de importes alineadas a la
  derecha con números tabulares: "Precio base S/ 100.00", "Beneficio Adulto Mayor (−50 %) −S/ 50.00" en #0E7C63,
  y "TOTAL S/ 50.00 PEN" en 22px semibold.
- Bloque "Código de reserva": caja con fondo #F4FAFF y borde #C9E6FE que muestra el UUID en monoespaciada 14px
  "7f3c2b1a-9d4e-4c8b-8a11-2f6e9d0c4b77" y un botón secundario "Copiar" a la derecha.
- Línea de estado: punto verde y "Activa", seguida de "Creada el 24 oct 2026, 09:58".
- Nota con icono de sobre: "Enviamos la confirmación por correo y notificación push."
- Al pie: botón primario "Ver mis reservas" y botón terciario "Reservar otro horario".
```

### 11.7 Prompt S6 — Incidentes: reportar y seguir

```text
Genera una pantalla web de escritorio 1280px "Incidentes comunitarios" con el sistema celeste.

Mitad superior, tarjeta blanca con título "Reportar un daño" (22px semibold):
- Fila de tres campos: select "Espacio afectado" con "Cancha de Veteranos Miraflores"; input "Tu identificador" con
  "vecino-auditor-01"; y un textarea de ancho completo con etiqueta "¿Qué pasó?", valor
  "Tablero de básquet con fisura en el soporte norte, cerca de la entrada." y contador debajo a la derecha
  "23 / 2000 caracteres" en 12px #56718A.
- Botón primario alineado a la derecha "Enviar reporte".

Mitad inferior, tarjeta de "Seguimiento" con un riel horizontal de 4 nodos conectados:
"En revisión" (actual: círculo #15699E lleno, etiqueta en #124F77 sobre #E3F2FF), "Aprobado", "Resuelto" en gris
celeste, y una rama inferior hacia "Rechazado" con nota pequeña "estado terminal". Los nodos no tienen botones:
es solo visualización del ciclo de vida.

Debajo, dos tarjetas de reporte:
1) "#f7e8d9c0… · Cancha de Veteranos Miraflores" con insignia "En revisión" (#FFF3E0 / #9A5B00), descripción
"Vidrio rajado en la pared norte, cerca de la entrada.", "Reportó vecino-auditor-01 · 21 oct 2026, 15:00".
2) Una segunda tarjeta en estado "Resuelto" (#E4F7F1 / #0E7C63) con "Aro de básquet reemplazado" y
"Resuelto el 22 oct 2026, 11:20".
Incluye el estado vacío del seguimiento: ilustración lineal celeste, "Sin reportes para este espacio" y botón
secundario "Ver todos los espacios".
```

### 11.8 Refinamientos útiles (prompts cortos)

- "Sube el contraste del texto secundario a #124F77 y conserva todo lo demás."
- "Convierte la grilla de tarjetas de 3 a 2 columnas y aumenta el padding de tarjeta a 24px."
- "Reemplaza los iconos emoji por iconos lineales de trazo 1.75px en #15699E."
- "Agrega el estado de carga de esta pantalla usando skeletons celestes, sin cambiar el layout."

---

## 12. Decisión de stack del cliente

Se fija **Opción A: React 19 + Vite + TypeScript + Tailwind CSS + Lucide**, por tres razones verificables:
reutiliza los tipos de `src/application/dtos/` y los esquemas Zod sin duplicar contratos; Tailwind expresa los
tokens de §3 como `theme.extend` (celeste, radios, sombras, tipografía); y Vite permite un proxy `/api` hacia
`http://localhost:3000` sin tocar `helmet()` ni `cors()` del servidor.

Mapeo mínimo de tokens a Tailwind:

```ts
theme: { extend: {
  colors: {
    canvas: '#F4FAFF', surface: '#FFFFFF', tint: '#E9F4FD',
    border: { DEFAULT: '#CDE4F7', strong: '#A9BDCD' },
    ink: { DEFAULT: '#0C1F2E', soft: '#56718A' },
    sky: { 50:'#F2F9FF',100:'#E3F2FF',200:'#C9E6FE',300:'#A5D5FB',400:'#74BEF5',
           500:'#3FA3E8',600:'#1E86C9',700:'#15699E',800:'#124F77',900:'#0D3A58' }
  },
  borderRadius: { card: '12px', control: '8px', sheet: '16px' },
  boxShadow: { card: '0 1px 2px rgba(12,31,46,.06)', raised: '0 8px 24px rgba(18,79,119,.10)' },
  fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'monospace'] }
}}
```

---

## 13. Cierre

Este documento reemplaza la propuesta de `PRE-DESIGN.md` para efectos de diseño. El original se conserva como
insumo histórico; su eliminación es una decisión del responsable del proyecto. La siguiente acción de
implementación es crear el proyecto Vite y pegar el Prompt 0 en Google Stitch para fijar la identidad celeste
antes de generar el resto de pantallas.

## Anexo A — Hallazgos de la validación (evidencia en código)

Severidad: **A** = rompe la implementación, **B** = degrada UX o accesibilidad, **C** = precisión documental.

| # | Sev. | Hallazgo | Evidencia | Corrección aplicada |
| :-- | :-- | :--- | :--- | :--- |
| F1 | A | Nombres, precios y horarios de espacios del borrador no existen; los horarios difieren por espacio, no son 08:00–22:00 globales | `space.in-memory.repository.ts:123-126` | Catálogo real en S1 §5; horas siempre desde `availabilityWindows` |
| F2 | A | Regla de zona horaria ambigua ("Date locales o UTC consistentes"): rompe reservas nocturnas | `time-slot.vo.ts:1,19-20` | §6.4 con ejemplo canónico y prohibiciones explícitas |
| F3 | A | Acciones sin endpoint: aprobar/rechazar/resolver incidente y cancelar reserva | `incident.routes.ts:8-10`, `reservation.routes.ts:10-12`; métodos solo en `incident.entity.ts:73-84` | §6.3: ciclo de vida en solo lectura; sin "Cancelar" |
| F4 | B | Paleta original: ámbar `#F59E0B` como texto sobre fondo claro (≈2.3:1) y verde petróleo dominante | Borrador §3.1 | §3.1: celeste claro completo, contrastes medidos, ámbar solo como fondo |
| F5 | B | Faltaban endpoints que las vistas necesitan (`/spaces/availability`, `/users/:userId/reservations`, `/spaces/:id/incidents`) | `routes/*.ts` | §6.1 + S2 y S5 rediseñadas sobre ellos |
| F6 | B | `429 RATE_LIMIT_EXCEEDED` (100 req/15 min) omitido, crítico en S2 por llamadas por franja | `rate-limit.middleware.ts:4-13` | §7 y presupuesto de 6 franjas con caché 60 s en S2 |
| F7 | B | Aforo por franja sugerido implícitamente ("Capacidad: 22 per") sin respaldo: solo hay solapamiento | `space.entity.ts:7,80-84` | Regla explícita "nunca aforo disponible" en S1 §5 |
| F8 | C | "Mis Reservas" sin fuente de datos ni forma de resolver el nombre del espacio (no viene en el DTO) | `reservation-response.dto.ts:4-13` | S5 con `GET /users/:userId/reservations`; S4 resuelve nombre por catálogo |
| F9 | C | Estados de incidente sin traducción ni representación accesible (solo color) | `incident-state.vo.ts:1` | §4 `StatusBadge` + §10 microcopy; icono + etiqueta |
| F10 | C | Sin estados de carga, vacío ni error; wireframes estáticos | Borrador §4 | §5 (por pantalla) y §4 (por componente) |
| F11 | C | Contador de descripción "1–2000" no validaba el mínimo visible | `incident.controller.ts:15` | S6: contador `n / 2000`, `maxlength`, recorte y validación de mín. 1 |
| F12 | C | Dos stacks alternativos sin decisión tomada | Borrador §7 | §12: objetivo único React 19 + Vite + Tailwind (tokens mapeados) |
| F13 | A | Códigos de error inventados `SPACE_INACTIVE` / `SPACE_INACTIVE_FOR_INCIDENT`: no existen en el backend | `entity-not-found.exception.ts:2-5`, `create-reservation.handler.ts:37`, `create-incident.handler.ts:25-26` | §7: matriz real (`404 SPACE_NOT_FOUND` enmascarando inactividad, `400 BAD_REQUEST`, `INCIDENT_NOT_FOUND`, `RESERVATION_NOT_FOUND`) + regla de desambiguación por catálogo |
| F14 | B | El borrador prometía distinguir "espacio inactivo" de "espacio inexistente"; el backend usa el mismo código `SPACE_NOT_FOUND` para ambos al reservar | `create-reservation.handler.ts:34,37` | Regla explícita: la UI decide por `isActive` del catálogo cargado, nunca por `error.code` ni por `message` |

## Anexo B — Checklist de aceptación del diseño

- [ ] Todos los colores provienen de §3.1; no hay hex sueltos en las pantallas.
- [ ] Toda cifra monetaria usa `tabular-nums` y formato `S/ 0.00 PEN`.
- [ ] Toda fecha mostrada está formateada en `America/Lima`.
- [ ] Ninguna pantalla ofrece una acción sin endpoint en §6.1.
- [ ] Cada pantalla define carga, vacío y error.
- [ ] Todo estado se comunica con texto, no solo con color.
- [ ] A 360 px no hay scroll horizontal; los CTA están en la zona del pulgar.
- [ ] Foco visible en el 100 % de los interactivos; `Esc` cierra hojas.
- [ ] `prefers-reduced-motion` respetado en todas las transiciones.
- [ ] El prompt de Stitch de cada pantalla reproduce §5 sin contradicciones.

---
