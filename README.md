# Dental Leads

SaaS de captación, gestión y conversión de leads para clínicas dentales — parte del ecosistema **Impulsodent**.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Vercel Ready](https://img.shields.io/badge/Vercel-ready-black?logo=vercel)

---

## Tabla de contenidos

- [Visión general](#-visión-general)
- [Características](#-características)
- [Stack técnico](#-stack-técnico)
- [Primeros pasos (Local)](#-primeros-pasos-local)
- [Credenciales demo](#-credenciales-demo)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Base de datos (Neon)](#-base-de-datos-neon)
- [Despliegue en Vercel](#-despliegue-en-vercel)
- [Variables de entorno](#-variables-de-entorno)
- [Scripts disponibles](#-scripts-disponibles)
- [Sistema de diseño](#-sistema-de-diseño)
- [Integraciones](#-integraciones)
- [Roadmap](#-roadmap)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Visión general

**Dental Leads** es la herramienta de **captación y conversión de pacientes** del ecosistema Impulsodent. Está diseñada para clínicas dentales —individuales o grupos multi-centro— que reciben leads por WhatsApp, formularios web, llamadas y campañas de marketing, y necesitan un sistema único para capturar, cualificar, asignar y medir cada oportunidad hasta la visita.

A diferencia de un CRM genérico, Dental Leads está construido alrededor del **ciclo de vida real de un lead dental**: desde la entrada por el canal hasta la conversión en cita confirmada, con métricas operativas (tiempo de respuesta, ratio de conversión, pipeline por tratamiento) y controles regulatorios específicos (RGPD explícito, auditoría completa, segregación por clínica).

## ✨ Características

- **Multi-tenant / multi-clínica** — Arquitectura `Company → Clinic → User` con acceso granular por clínica (`UserClinicAccess`).
- **Dashboard ejecutivo** — KPIs clave (leads nuevos, tasa de conversión, tiempo de respuesta, pipeline por estado y por clínica).
- **Bandeja unificada de leads** — Lista paginada con filtros avanzados (estado, prioridad, canal, clínica, responsable, rango de fechas, búsqueda full-text).
- **Ficha de lead** — Detalle con timeline de eventos, notas (públicas y privadas), citas asociadas, UTMs y datos de campaña, historial de asignación.
- **Formularios embebibles** — Builder de formularios públicos con fields configurables, mapeo a campos de lead, webhooks y redirecciones post-submit.
- **Canales** — WhatsApp (adapter-ready, modo mock por defecto), formularios, webhooks entrantes, creación manual e **importación CSV** con mapeo de columnas.
- **Automatizaciones** — Motor de reglas por triggers (lead creado, sin respuesta, cita creada…) con condiciones y acciones (asignar, cambiar estado, notificar).
- **Auditoría completa** — Log de todas las acciones relevantes (`CREATE / UPDATE / DELETE / LOGIN / IMPORT / ASSIGNMENT_CHANGE …`) con IP, user-agent y diffs.
- **RBAC granular** — 7 roles (`SUPERADMIN`, `ADMIN_EMPRESA`, `DIRECCION`, `RECEPCION`, `CALLCENTER`, `MARKETING`, `COMERCIAL`) con matriz de permisos recurso × acción.
- **Mobile-first** — Todas las vistas funcionan en móvil (bandeja, ficha, modales, formularios).
- **RGPD-first** — Consentimiento explícito configurable, política de retención, derecho al olvido vía soft-delete.

## 🏗️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript 5.7 (strict) |
| UI | Tailwind CSS 3.4, Radix UI, Lucide Icons |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL (Neon serverless recomendado) |
| Auth | Auth.js v5 (NextAuth beta) con Credentials + PrismaAdapter |
| Validación | Zod |
| Formularios | react-hook-form + @hookform/resolvers |
| Charts | Recharts |
| Fechas | date-fns (locale `es`) |
| Hash passwords | bcryptjs |
| Despliegue | Vercel (recomendado) |

## 🚀 Primeros pasos (Local)

### Requisitos previos

- **Node.js ≥ 20**
- **npm ≥ 10**
- Una base de datos PostgreSQL accesible (Neon, Supabase, Railway, local)
- `git`

### Instalación

```bash
git clone https://github.com/andreumarc/dental-leads.git
cd dental-leads

# Instalar dependencias (genera cliente Prisma via postinstall)
npm install

# Crear archivo de variables de entorno
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL de Neon / Postgres y tu AUTH_SECRET
```

### Variables mínimas requeridas

```env
DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
DIRECT_URL="postgres://user:pass@host/db?sslmode=require"
AUTH_SECRET="un-secreto-aleatorio-largo"
NEXTAUTH_URL="http://localhost:3000"
```

Para generar `AUTH_SECRET`:

```bash
npx auth secret
# o
openssl rand -base64 32
```

### Arrancar la app

```bash
# Aplicar schema a la BD
npm run db:push

# Poblar con datos demo (empresas, clínicas, usuarios, leads, formularios)
npm run db:seed

# Levantar dev server
npm run dev
```

Abre `http://localhost:3000` y entra con una de las cuentas demo (ver abajo).

## 🧑‍💼 Credenciales demo

Tras ejecutar `npm run db:seed`, dispondrás de los siguientes usuarios:

| Rol | Email | Password |
|---|---|---|
| Superadmin | `marcandreueguerao@gmail.com` | `Admin1234!` |
| Admin empresa | `admin@dentalleads.com` | `Demo2026!` |
| Dirección | `direccion@dentalleads.com` | `Demo2026!` |
| Recepción | `recepcion@dentalleads.com` | `Demo2026!` |
| Call center | `callcenter@dentalleads.com` | `Demo2026!` |
| Marketing | `marketing@dentalleads.com` | `Demo2026!` |
| Comercial | `comercial@dentalleads.com` | `Demo2026!` |
| Read-only demo | `demo@impulsodent.com` | `Demo2026!` |

> Las credenciales reales pueden variar según el `seed.ts` de tu rama. Revisa `prisma/seed.ts`.

## 📦 Estructura del proyecto

```
dental-leads/
├── prisma/
│   ├── schema.prisma      # Esquema de datos completo (Company, Clinic, Lead, …)
│   └── seed.ts            # Seed de datos demo
├── src/
│   ├── adapters/          # Adapters (WhatsApp Meta, WhatsApp Twilio, mock)
│   ├── app/
│   │   ├── (auth)/        # Login / logout
│   │   ├── (dashboard)/   # Todas las vistas autenticadas
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   │   ├── [id]/
│   │   │   │   └── import/
│   │   │   ├── appointments/
│   │   │   ├── forms/
│   │   │   ├── channels/
│   │   │   ├── automations/
│   │   │   ├── clinics/
│   │   │   ├── users/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   └── api/           # API routes (REST + public webhooks)
│   │       ├── leads/
│   │       ├── users/
│   │       ├── clinics/
│   │       ├── channels/
│   │       ├── automations/
│   │       ├── forms/
│   │       ├── settings/
│   │       ├── audit/
│   │       ├── public/    # Endpoints públicos (forms submit, csv import)
│   │       └── webhooks/  # Webhooks entrantes (WhatsApp, etc.)
│   ├── components/
│   │   ├── ui/            # Primitivas reutilizables (PageHeader, Badge, EmptyState…)
│   │   └── layout/        # Sidebar, Topbar, navigation
│   ├── features/          # Un folder por módulo con clientes `'use client'`
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── appointments/
│   │   ├── users/
│   │   ├── clinics/
│   │   ├── settings/
│   │   └── audit/
│   ├── lib/
│   │   ├── auth.ts        # NextAuth v5 config
│   │   ├── prisma.ts      # Singleton Prisma client
│   │   ├── rbac.ts        # Matriz de permisos + helpers
│   │   ├── utils.ts       # cn, formatDate, slugify, getInitials, …
│   │   └── automations/   # Motor de reglas
│   ├── middleware.ts      # Protección de rutas
│   └── types/             # Tipos compartidos
├── docs/                  # Documentación adicional
│   ├── DEPLOYMENT.md
│   ├── DATABASE.md
│   ├── API.md
│   └── INTEGRATIONS.md
├── public/
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🗄️ Base de datos (Neon)

Dental Leads está optimizado para [Neon](https://neon.tech) (PostgreSQL serverless), que es la base de datos recomendada para todo el ecosistema Impulsodent.

### Crear proyecto en Neon

1. Regístrate o inicia sesión en [console.neon.tech](https://console.neon.tech).
2. Crea un proyecto nuevo (regiones recomendadas: `eu-west-2` Londres, `eu-central-1` Frankfurt).
3. Dentro del proyecto, ve a **Connection Details** y copia las dos strings:
   - **Pooled connection** → `DATABASE_URL` (para runtime Vercel serverless).
   - **Direct connection** → `DIRECT_URL` (para migraciones Prisma).

### Aplicar schema

```bash
# Primera vez / dev: sync rápido sin migrations
npm run db:push

# Producción: generar y aplicar migrations
npm run db:migrate
```

### Seed

```bash
npm run db:seed
```

### Inspección con Prisma Studio

```bash
npm run db:studio
# abre http://localhost:5555
```

Para más detalle (branches, backups, migraciones sin downtime) consulta [`docs/DATABASE.md`](./docs/DATABASE.md).

## ☁️ Despliegue en Vercel

1. **Push a GitHub.**
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio.
3. Framework preset: **Next.js** (autodetectado).
4. Configura las variables de entorno:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | pooled connection string de Neon |
   | `DIRECT_URL` | direct connection string de Neon |
   | `AUTH_SECRET` | generado con `npx auth secret` |
   | `NEXTAUTH_URL` | `https://tu-proyecto.vercel.app` |

5. Build command: **default** (`next build`). El `postinstall` hook ya ejecuta `prisma generate`.
6. **Deploy.**
7. Tras el primer deploy, ejecuta el seed contra la BD de producción:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." npm run db:seed
   ```

Guía detallada con capturas en [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## 🔐 Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión pooled (app runtime) |
| `DIRECT_URL` | Sí | Conexión directa (migrations, seed) |
| `AUTH_SECRET` | Sí | Secreto JWT (32+ chars) |
| `NEXTAUTH_URL` | Sí en prod | URL pública de la app |
| `WHATSAPP_PROVIDER` | No | `mock` \| `meta` \| `twilio` — default `mock` |
| `WHATSAPP_VERIFY_TOKEN` | No | Token de verificación webhook Meta |
| `WHATSAPP_ACCESS_TOKEN` | No | Token de Meta Business (si provider=meta) |
| `WHATSAPP_PHONE_NUMBER_ID` | No | ID de número WhatsApp en Meta |
| `TWILIO_ACCOUNT_SID` | No | Si `WHATSAPP_PROVIDER=twilio` |
| `TWILIO_AUTH_TOKEN` | No | Si `WHATSAPP_PROVIDER=twilio` |
| `HUB_JWT_SECRET` | No | Para SSO cross-app con el Hub ImpulsoDent |

## 🧪 Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta el dev server en `localhost:3000` |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenera el cliente de Prisma |
| `npm run db:push` | Sincroniza schema con BD (dev) |
| `npm run db:migrate` | Crea y aplica migration (prod) |
| `npm run db:seed` | Pobla con datos demo |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:reset` | Reset completo + re-seed |

## 🎨 Sistema de diseño

Dental Leads comparte el **sistema visual definitivo ImpulsoDent**:

- **Sidebar navy** `#0F1F3C` (navegación principal, ancho fijo en desktop).
- **Primario teal** `teal-600` / `#0D9488` (CTA, badges activos, elementos interactivos).
- **Fondos neutrales** `bg-neutral-50` para páginas, `bg-white` con `rounded-xl border border-neutral-200 shadow-sm` para cards.
- **Tipografía** Inter / system stack vía Tailwind defaults.
- **Radio** 8–12 px (`rounded-lg` / `rounded-xl`).
- **Iconografía** Lucide Icons (stroke-width 2).
- **Accesibilidad** foco visible con `ring-2 ring-teal-500`, estados disabled explícitos.

Componentes reutilizables en `src/components/ui/`:

- `PageHeader` — título, breadcrumbs, acciones
- `EmptyState` — icono circular + título + descripción + action
- `Badge`, `LeadStatusBadge`, `PriorityBadge`, `ChannelBadge`, `RoleBadge`
- `DataTable` — abstracción sobre @tanstack/react-table
- `FileUpload` — drag & drop con preview
- `Skeleton`, `StatCard`, `ToastProvider`

## 🔌 Integraciones

### WhatsApp

Arquitectura **adapter pattern** en `src/adapters/whatsapp/`:

- `mock` — adaptador por defecto, útil para desarrollo y demos.
- `meta` — Meta Business Platform (WhatsApp Cloud API).
- `twilio` — Twilio WhatsApp API.

Se selecciona con la env var `WHATSAPP_PROVIDER`. Webhook entrante: `/api/webhooks/whatsapp`.

Pasos para conectar Meta Business:

1. Alta en [business.facebook.com](https://business.facebook.com) → WhatsApp → API.
2. Obtén `PHONE_NUMBER_ID` y `ACCESS_TOKEN` (temporal / permanente).
3. Configura variables:
   ```
   WHATSAPP_PROVIDER=meta
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=123456789
   WHATSAPP_VERIFY_TOKEN=un-secreto
   ```
4. En Meta, añade webhook a `https://tu-dominio.com/api/webhooks/whatsapp` con el verify token.

### Formularios embebibles

Crea un formulario en `/forms`, copia el `embedCode` y pégalo en tu web:

```html
<iframe
  src="https://tu-dominio.com/forms/clinica-madrid-centro"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

Submissions llegan a `/api/public/forms/[slug]` y crean un `Lead` + `FormSubmission`.

### Webhooks entrantes

- `POST /api/public/forms/[slug]` — submit de formulario público.
- `POST /api/public/import?companyId=…&clinicId=…` — importación CSV multipart.
- `POST /api/webhooks/whatsapp` — mensajes entrantes WhatsApp.

Ejemplos de payload en [`docs/API.md`](./docs/API.md) e [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md).

## 🛣️ Roadmap

### MVP (actual) ✅

- Autenticación + RBAC granular con 7 roles.
- Multi-empresa / multi-clínica.
- Dashboard con KPIs.
- Bandeja de leads con filtros, búsqueda y paginación.
- Ficha de lead con timeline, notas, citas, UTMs.
- Formularios embebibles con builder.
- Canales (WhatsApp adapter pattern, formularios, webhooks, manual, CSV).
- Motor de automatizaciones con reglas y plantillas.
- Importación CSV con mapeo de columnas.
- Auditoría completa con exportación.
- Ajustes empresa / notificaciones / integraciones / RGPD.
- Gestión de usuarios y clínicas.
- Diseño mobile-first.

### V2 (próximo trimestre)

- **Colas + workers** con BullMQ + Redis para automations y envíos asíncronos.
- **Plantillas de mensaje** (WhatsApp templates + email templates) con variables.
- **Analíticas avanzadas** (cohorts, funnel, attribution multi-touch).
- **Reportes programados** (PDF/CSV por email con cron).
- **Quick replies / respuestas canned** en la ficha de lead.
- **Calendario visual** de citas con drag & drop.

### V3

- **IA de triage** de leads (scoring, priorización automática).
- **Call-center dialer** integrado (click-to-call, grabación, transcripción).
- **Multi-idioma UI** (EN, PT).
- **Apps móviles** iOS/Android con Expo.
- **SDK público** para terceros.

## 🧑‍💻 Contribuir

Este es un proyecto propietario de Impulsodent. Las contribuciones internas siguen el flujo:

1. Crear rama `feat/nombre-feature` o `fix/descripcion` desde `main`.
2. Commit siguiendo convenciones (`feat:`, `fix:`, `chore:`, `docs:`).
3. Pull Request con descripción + screenshots si hay UI.
4. Esperar review + merge squash.

## 📄 Licencia

Propietario — **Impulsodent © 2026**. Todos los derechos reservados.
