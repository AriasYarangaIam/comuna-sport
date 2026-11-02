# ComunaSport — Guía de Diseño UI/UX y Arquitectura Frontend

> **Propósito del documento:** Especificación integral de diseño de interfaz de usuario (UI), experiencia de usuario (UX) y arquitectura de cliente web adaptable a la API de **ComunaSport**. Diseñado para maximizar el impacto social, la transparencia municipal y la accesibilidad ciudadana.

---

## Tabla de Contenidos

1. [Visión de Diseño e Impacto Social](#1-visión-de-diseño-e-impacto-social)
2. [Perfiles de Usuario (User Personas) y Adaptabilidad](#2-perfiles-de-usuario-user-personas-y-adaptabilidad)
3. [Sistema de Diseño (Design Tokens)](#3-sistema-de-diseño-design-tokens)
4. [Propuestas de Vistas Principales (Wireframes y Flujos)](#4-propuestas-de-vistas-principales-wireframes-y-flujos)
5. [Integración Técnica UI ↔ API (Arquitectura Hexagonal)](#5-integración-técnica-ui--api-arquitectura-hexagonal)
6. [Mapeo de Estados de Error (`APIError`) a Componentes Visuales](#6-mapeo-de-estados-de-error-apierror-a-componentes-visuales)
7. [Propuesta de Stack Tecnológico para el Cliente](#7-propuesta-de-stack-tecnológico-para-el-cliente)

---

## 1. Visión de Diseño e Impacto Social

El problema central que resuelve **ComunaSport** no es meramente tecnológico, sino **social y comunitario**: erradicar el favoritismo, los conflictos vecinales y la falta de auditoría en el uso de canchas y losas deportivas municipales.

Por ello, el diseño de la interfaz se rige por tres pilares fundamentales:

* **Transparencia Radical (Cero Favoritismo):** El calendario de ocupación y las tarifas aplicadas deben ser públicos y visibles en tiempo real. Cualquier vecino debe poder verificar por qué un horario está ocupado y cuál es la regla tarifaria aplicada.
* **Inclusión y Accesibilidad (`WCAG 2.1 AA+`):** Dado que el sistema contempla el rol `SENIOR` ($50\%$ de descuento para adultos mayores), la interfaz no puede ser una aplicación compleja o de bajo contraste. Requiere tipografía clara, botones de área táctil amplia (mínimo $48 \times 48\text{ px}$) y flujos guiados paso a paso.
* **Corresponsabilidad Ciudadana:** El módulo de reporte de incidentes transforma al vecino de un "usuario pasivo" a un **auditor de la infraestructura pública**, visibilizando el ciclo de vida de cada daño reportado (`UNDER_REVIEW` $\rightarrow$ `APPROVED` / `REJECTED` $\rightarrow$ `RESOLVED`).

---

## 2. Perfiles de Usuario (User Personas) y Adaptabilidad

La interfaz se adapta dinámicamente según el contexto de uso y el rol seleccionado (`UserRoleType`):

| Rol en el Dominio | Perfil Ciudadano | Necesidad Principal en la UI | Adaptación Visual / UX |
| :--- | :--- | :--- | :--- |
| **`NEIGHBOR` / `YOUTH`** | Vecinos y jóvenes deportistas | Reservar rápido desde el celular antes de ir a la cancha. | Diseño **Mobile-First**, selección de horario con un solo toque, resumen claro de tarifa base ($\times 1.0$). |
| **`SENIOR`** | Adultos mayores de la comuna | Facilidad de lectura, confirmación clara de su beneficio social. | Alto contraste, insignia destacada **"Beneficio Adulto Mayor (-50%)"** mostrando el ahorro en `PEN`. |
| **`PRIVATE_CLUB`** | Academias o clubes privados | Certeza de reserva y comprobante formal con recargo solidario. | Desglose transparente del recargo ($\times 1.2$) explicando que subvenciona el mantenimiento comunitario. |
| **Auditor / Vecino** | Reportante de daños en losas | Reportar un aro roto o vidrio rajado en menos de 1 minuto. | Formulario directo con contador de caracteres ($1 - 2000$) y tablero público de estados de reparación. |

---

## 3. Sistema de Diseño (Design Tokens)

### 3.1. Paleta de Colores (Identidad Cívica y Deportiva)

Inspirada en los espacios deportivos urbanos (canchas de grass sintético, losas de cemento y señalética municipal clara):

| Token | Color Hex | Uso en el Sistema |
| :--- | :--- | :--- |
| `--color-primary` | `#0F766E` (Verde Cancha Profundo) | Acciones principales, encabezados, disponibilidad activa. |
| `--color-secondary` | `#1E293B` (Gris Asfalto / Losa) | Textos principales, navegación, bordes de alto contraste. |
| `--color-accent` | `#F59E0B` (Ámbar Iluminación) | Insignias de descuento (`SENIOR`), estados en revisión (`UNDER_REVIEW`). |
| `--color-surface` | `#F8FAFC` (Blanco Humo) | Fondo general para reducir fatiga visual al sol (uso móvil en exteriores). |
| `--color-success` | `#15803D` (Verde Semáforo) | Confirmación de reserva (`201`), incidente resuelto (`RESOLVED`). |
| `--color-warning` | `#B45309` (Naranja Alerta) | Conflicto de horario (`409 RESERVATION_CONFLICT`), aviso de recargo. |
| `--color-danger` | `#B91C1C` (Rojo Urgencia) | Errores de validación (`400`/`422`), espacio inactivo, incidente rechazado. |

### 3.2. Tipografía y Escala

* **Fuente Principal (UI y Cuerpo):** `Inter` o `Plus Jakarta Sans` (excelente legibilidad en pantallas pequeñas y números tabulares para precios en `PEN`).
* **Fuente Monoespaciada (IDs y Auditoría):** `JetBrains Mono` (para mostrar códigos de reserva UUID, `Idempotency-Key` y marcas de tiempo ISO).

---

## 4. Propuestas de Vistas Principales (Wireframes y Flujos)

Se proponen **3 módulos principales** (adaptables como pestañas en una Single Page Application o rutas independientes) más un panel interactivo de auditoría para la presentación académica.

---

### Vista 1: Explorador Comunitario de Espacios y Disponibilidad

Permite visualizar los espacios precargados en `InMemorySpaceRepository` (*Cancha Municipal Norte*, *Losa Deportiva Sur*, *Pista de Tenis Central*, *Cancha Multipropósito Este*).

```text
+-----------------------------------------------------------------------------------+
| 🏟️ COMUNASPORT                         [ Explorar ]  [ Mis Reservas ]  [ Incidentes ] |
+-----------------------------------------------------------------------------------+
| Filtrar por tipo: (Todos) [⚽ Fútbol] [🏀 Básquet] [🎾 Tenis] [🏃 Multipropósito]   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-----------------------------------+   +-----------------------------------+    |
|  | ⚽ CANCHA MUNICIPAL NORTE         |   | 🏀 LOSA DEPORTIVA SUR             |    |
|  | [ACTIVO]        Capacidad: 22 per |   | [ACTIVO]        Capacidad: 10 per |    |
|  |-----------------------------------|   |-----------------------------------|    |
|  | Tarifa Base: S/ 100.00 PEN / bloq |   | Tarifa Base: S/ 60.00 PEN / bloq  |    |
|  | Horario: 08:00 - 22:00            |   | Horario: 08:00 - 22:00            |    |
|  |                                   |   |                                   |    |
|  | [ 📅 Ver Horarios y Reservar ]    |   | [ 📅 Ver Horarios y Reservar ]    |    |
|  | [ ⚠️ Reportar Daño en Espacio ]   |   | [ ⚠️ Reportar Daño en Espacio ]   |    |
|  +-----------------------------------+   +-----------------------------------+    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

**Características clave conectadas al Dominio:**
* **Insignia de Tipo (`SpaceType`):** Traduce los literales `'CANCHA_FUTBOL'`, `'LOSA_BASQUET'`, `'PISTA_TENIS'` y `'MULTIPROPOSITO'` en etiquetas amigables con iconografía deportiva.
* **Indicador de Estado (`isActive`):** Si un espacio es desactivado (`space.deactivate()`), la tarjeta se muestra en escala de grises con la etiqueta `"EN MANTENIMIENTO / INACTIVO"` y deshabilita los botones de reserva e incidente (previniendo los errores `SPACE_INACTIVE` y `SPACE_INACTIVE_FOR_INCIDENT`).

---

### Vista 2: Asistente de Reserva Equitativa (Drawer / Modal Interactivo)

Ejecuta el caso de uso `POST /spaces/:id/reservations`. Su objetivo principal es hacer tangible el **Patrón Strategy + Factory** ante el usuario final.

```text
+-----------------------------------------------------------------------+
| Reservar: Cancha Municipal Norte                                  [X] |
+-----------------------------------------------------------------------+
| 1. IDENTIFICACIÓN DEL VECINO                                          |
|    ID de Usuario / DNI: [ user-vecino-4589                      ]     |
|                                                                       |
| 2. SELECCIONA TU CATEGORÍA COMUNITARIA (Cálculo Equitativo)           |
|    ( ) 🏠 Vecino General (NEIGHBOR)   -> Tarifa Estándar (100%)       |
|    ( ) 🎓 Joven / Estudiante (YOUTH)  -> Tarifa Estándar (100%)       |
|    (•) 👴 Adulto Mayor (SENIOR)       -> ¡Descuento Social del 50%!   |
|    ( ) 🏆 Club Privado (PRIVATE_CLUB) -> Tarifa Comercial (+20%)      |
|                                                                       |
| 3. FRANJA HORARIA (Mismo día calendario, dentro de 08:00 - 22:00)     |
|    Fecha:  [ 2026-10-22 ]                                             |
|    Inicio: [ 10:00 ]   Fin: [ 12:00 ]  (2 horas - Sin solapamiento)   |
|                                                                       |
| +-------------------------------------------------------------------+ |
| | 💳 RESUMEN DE TARIFA TRANSPARENTE                                 | |
| | Precio Base del Espacio:                         S/ 100.00 PEN    | |
| | Factor Aplicado (SeniorDiscountStrategy x0.5):  -S/  50.00 PEN    | |
| | ----------------------------------------------------------------- | |
| | TOTAL A PAGAR:                                   S/  50.00 PEN    | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| 🔒 Idempotency-Key activa: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d       |
|                                                                       |
| [ Cancelar ]                         [ ✅ Confirmar Reserva Ahora ]   |
+-----------------------------------------------------------------------+
```

**Reglas de UX conectadas al Dominio:**
1. **Simulador de Estrategia en Vivo:** Al cambiar el selector de rol, la UI pre-calcula visualmente el monto ($\text{base} \times 1.0$, $\times 0.5$ o $\times 1.2$ con redondeo a 2 decimales) explicando el motivo social del precio antes de enviar el comando al backend.
2. **Validación Preventiva de `TimeSlot`:** El selector de horas impide elegir una hora de fin menor o igual a la de inicio (`end <= start`) y bloquea selecciones que crucen la medianoche (garantizando la invariante *same calendar day* de `TimeSlot.create()`).
3. **Recibo Digital y Notificación (Patrón Observer):** Una vez recibido el `201 Created` con el `ReservationResponseDto`, se muestra un ticket digital y un banner informativo: *"📧 Hemos enviado la confirmación por correo y notificación Push a tu dispositivo"* (reflejando la ejecución asíncrona de `NotificationListener` al escuchar `ReservationConfirmedEvent`).

---

### Vista 3: Portal de Auditoría y Ciclo de Vida de Incidentes

Conecta con `POST /incidents` y visibiliza la **Máquina de Estados (`IncidentStateBehavior`)** para demostrar cómo la municipalidad gestiona los daños reportados.

```text
+-----------------------------------------------------------------------------------+
| 🛠️ GESTIÓN Y AUDITORÍA DE INCIDENTES COMUNITARIOS                                 |
+-----------------------------------------------------------------------------------+
| NUEVO REPORTE DE DAÑO                                                             |
| Espacio Afectado: [ Cancha Municipal Norte (UUID: ...)       v ]                  |
| ID Reportante:    [ vecino-auditor-01                          ]                  |
| Descripción:      [ Tablero de básquet presenta fisura en el soporte norte...   ] |
|                   (Caracteres: 58 / 2000 máx.)                                    |
|                                                        [ 🚨 Enviar Reporte ]      |
+-----------------------------------------------------------------------------------+
| SEGUIMIENTO DE REPORTES (Máquina de Estados del Dominio)                          |
|                                                                                   |
|  [🔍 EN REVISIÓN] --------(Aprobar)--------> [✅ APROBADO] ----(Resolver)---> [🛠️ RESUELTO]
|         |                                                                         |
|         +-----------------(Rechazar)-------> [❌ RECHAZADO (Estado Terminal)]     |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | ID: #f7e8d9c0  | Espacio: Cancha Norte | Reportó: user-456                  |  |
|  | "Vidrio rajado en la pared norte cerca de la entrada."                      |  |
|  | Estado Actual: [ 🔍 UNDER_REVIEW ]     | Creado: 2026-10-21 15:00           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

### Vista 4 (Bonus Académico): "Inspector de Arquitectura y Resiliencia"

Dado que este proyecto será evaluado por el profesor buscando complejidad técnica e impacto, se propone un **Panel Lateral o Modo Desarrollador (Inspector Drawer)** colapsable en la UI que permita demostrar en vivo las fortalezas del backend durante la exposición:

1. **Probador de Idempotencia en Vivo (Decisión D4):**
   * Un botón especial **"⚡ Simular Doble Clic / Reintento de Red"** al reservar.
   * Envía dos peticiones con la misma `Idempotency-Key` para mostrar en pantalla cómo la API responde `409 IDEMPOTENCY_CONFLICT (in_flight)` o devuelve un `201 Replay` con exactamente el mismo `ReservationId` sin duplicar el cobro ni la reserva.
   * Un segundo botón **"🧪 Simular Payload Mismatch"** que reutiliza la llave cambiando el rol o el horario, demostrando el bloqueo `422 Unprocessable Entity`.
2. **Consola Visual del Bus de Eventos (Observer):**
   * Un pequeño feed en la esquina inferior que muestra los eventos emitidos en tiempo real (`[EVENTO EMITIDO] ReservationConfirmed -> NotificationListener [EMAIL / PUSH]`).

---

## 5. Integración Técnica UI ↔ API (Arquitectura Hexagonal)

Para que el frontend respete los contratos de tu backend, debe implementar las siguientes reglas de comunicación:

### 5.1. Gestión Automática del `Idempotency-Key`

En la vista de creación de reservas (`POST /spaces/:id/reservations`), el cliente web **nunca** debe generar un UUID nuevo en cada clic del botón "Enviar". 

* **Ciclo correcto en el Frontend:**
  1. Cuando el usuario abre el modal de reserva o modifica algún campo del formulario (`userId`, `role`, `timeSlot`), el estado del componente genera un nuevo `crypto.randomUUID()` y lo guarda como `currentIdempotencyKey`.
  2. Si el usuario hace clic en **"Confirmar Reserva"** y la red parpadea o hace doble clic, el cliente reenvía exactamente el mismo `currentIdempotencyKey` en la cabecera HTTP `Idempotency-Key`.
  3. Solo cuando la reserva se completa con éxito (`201`) o el usuario cambia los datos del formulario, se rota la llave.

### 5.2. Transformación de Fechas a ISO 8601

El validador Zod en `ReservationController` y el Value Object `TimeSlot` esperan cadenas válidas de fecha que pertenezcan al mismo día calendario.
* La UI debe combinar el input de fecha (`YYYY-MM-DD`) y los inputs de hora (`HH:mm`) construyendo objetos `Date` locales o UTC consistentes antes de serializarlos con `.toISOString()`.

---

## 6. Mapeo de Estados de Error (`APIError`) a Componentes Visuales

Tu backend estandariza todos los errores bajo la estructura `{ error: { code, message, details? } }`. La UI debe interceptar estos códigos y presentarlos de forma empática al ciudadano:

| Código HTTP | `error.code` de la API | Componente UI | Mensaje Amigable al Usuario |
| :--- | :--- | :--- | :--- |
| **400** | `MISSING_IDEMPOTENCY_KEY` | Banner Técnico (Toast) | *"Error de seguridad en la solicitud. Recarga el formulario e intenta nuevamente."* |
| **400** | `BAD_REQUEST` (Ej. `slot end must be after start`) | Mensaje inline bajo el reloj | *"La hora de finalización debe ser posterior a la hora de inicio y dentro del mismo día."* |
| **400** | `BAD_REQUEST` (Fuera de ventana de disponibilidad) | Alerta Amarilla en Calendario | *"El horario elegido está fuera del horario de atención de la cancha."* |
| **404** | `SPACE_NOT_FOUND` | Estado Vacío / Redirección | *"El espacio deportivo solicitado no existe o ya no se encuentra disponible."* |
| **409** | `RESERVATION_CONFLICT` | Modal de Conflicto con Sugerencia | *"¡Ups! Otro vecino acaba de reservar este horario. Por favor, elige otro bloque disponible."* |
| **409** | `IDEMPOTENCY_CONFLICT` (`in_flight`) | Spinner en Botón (Bloqueo suave) | *"Tu reserva ya se está procesando, por favor espera unos segundos..."* |
| **422** | `IDEMPOTENCY_CONFLICT` (`payload_mismatch`) | Alerta de Integridad | *"Detectamos un cambio en los datos de tu reserva. Hemos actualizado tu sesión, intenta confirmar nuevamente."* |
| **422** | `STATE_TRANSITION_INVALID` | Badge de Acción Bloqueada | *"No se puede cambiar el estado de este incidente porque ya fue cerrado o rechazado."* |

---

## 7. Propuesta de Stack Tecnológico para el Cliente

Para mantener la coherencia con tu stack actual (**TypeScript 6.0.3**, **Node $\ge 22.13$**, **Zod**), se recomiendan dos caminos según el tiempo que dispongas para la entrega:

### Opción A: Aplicación Web Ligera Integrada (Recomendada por Velocidad y Cohesión)
* **Tecnología:** **React 19 + Vite + Tailwind CSS + Lucide Icons**.
* **Ventaja:** Permite compartir directamente las interfaces de tus DTOs (`ReservationResponseDto`, `IncidentResponseDto`) y esquemas de validación `Zod` entre el backend y el frontend sin duplicar tipos.

### Opción B: Dashboard Interactivo Vanilla TS / HTML5 Servido por Express
* **Tecnología:** Servir una carpeta `public/` estática desde tu mismo `main.ts` usando `express.static`, estilizada con **Tailwind CSS** y lógica modular en TypeScript.
* **Ventaja:** Cero configuración de servidores adicionales (`pnpm dev` levanta tanto la API como la interfaz gráfica en `http://localhost:3000`), ideal para que el profesor evalúe todo el proyecto ejecutando un único comando.