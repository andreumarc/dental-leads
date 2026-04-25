# Guía de base de datos — Dental Leads

Dental Leads usa **PostgreSQL** como única base de datos. La opción oficial recomendada es [Neon](https://neon.tech) (serverless Postgres), pero cualquier Postgres 14+ es compatible.

---

## 1. Esquema general

El esquema vive en `prisma/schema.prisma`. Diseño multi-tenant con segregación por `companyId`:

```
Company (tenant)
 ├─ Clinic[] (centros físicos)
 │   └─ ClinicSettings (1:1)
 ├─ User[] (empleados del tenant)
 │   └─ UserClinicAccess[] (m:n con Clinic)
 ├─ Lead[]
 │   ├─ LeadTag[]
 │   ├─ LeadEvent[]
 │   ├─ LeadNote[]
 │   ├─ Appointment[]
 │   └─ LeadAssignmentHistory[]
 ├─ FormDefinition[] → FormField[], FormSubmission[]
 ├─ Channel[] → IntegrationAccount, ChannelLog[], Conversation[]
 ├─ Campaign[]
 ├─ AutomationRule[]
 ├─ AuditLog[]
 └─ CompanySettings (1:1)
```

### Aislamiento multi-tenant

**Toda** query que devuelve datos del tenant incluye `where: { companyId: session.user.companyId }`. El único rol que puede saltarse ese filtro es `SUPERADMIN`, y se aplica explícitamente en el endpoint (ver `src/app/api/audit/route.ts` como ejemplo).

### Enums clave

- `UserRole`: 7 roles (ver RBAC en `src/lib/rbac.ts`).
- `LeadStatus`: 16 estados cubriendo el ciclo completo.
- `LeadPriority`: `BAJA`, `MEDIA`, `ALTA`, `URGENTE`.
- `ChannelType`: `WHATSAPP`, `FORM_WEB`, `LANDING`, `MANUAL`, `CALLCENTER`, `CSV_IMPORT`, `WEBHOOK`, `GENERIC`.
- `AppointmentStatus`: `SOLICITADA` → `PROPUESTA` → `CONFIRMADA` → `REALIZADA` / `NO_PRESENTADO` / `CANCELADA`.
- `AuditAction`: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `EXPORT`, `IMPORT`, `STATUS_CHANGE`, `ASSIGNMENT_CHANGE`.

---

## 2. Setup en Neon

### 2.1 Crear proyecto

1. [console.neon.tech](https://console.neon.tech) → **New Project**.
2. Nombre: `dental-leads-prod` (y opcionalmente otro `dental-leads-dev`).
3. Postgres 16, region más cercana al deploy de Vercel.

### 2.2 Connection strings

Neon te entrega dos URLs: **pooled** y **direct**.

| Uso | URL |
|---|---|
| Runtime Next.js (API routes, SSR) | `DATABASE_URL` = **pooled** |
| `prisma migrate`, `prisma db push`, seed | `DIRECT_URL` = **direct** |

El motivo: Prisma necesita una conexión directa para aplicar DDL, pero en serverless conviene pooler para el tráfico normal.

### 2.3 Branches (preview deploys aislados)

Neon ofrece **branches** tipo git a nivel de BD:

```bash
# Crear branch preview
neonctl branches create --name preview-pr-42 --project-id <proj>

# Obtener conexion string del branch
neonctl connection-string preview-pr-42
```

En Vercel, puedes configurar un integration oficial de Neon que crea un branch por PR automáticamente y rellena `DATABASE_URL`/`DIRECT_URL` en el Preview deployment.

---

## 3. Flujo de migraciones

### Desarrollo local (rápido)

```bash
npm run db:push
```

`prisma db push` sincroniza el schema sin crear migrations. Ideal para iterar; no úsalo en producción.

### Producción (versionado)

```bash
# Crear migration desde los cambios locales
npx prisma migrate dev --name add_xxx

# Aplicar migrations en producción
DATABASE_URL="<direct>" DIRECT_URL="<direct>" npx prisma migrate deploy
```

Las migrations se guardan en `prisma/migrations/` y **deben** versionarse en git.

### Re-generar cliente

Tras cualquier cambio de schema:

```bash
npm run db:generate
```

El `postinstall` lo ejecuta automáticamente en Vercel builds.

---

## 4. Seed

`prisma/seed.ts` popula datos demo deterministas (1 empresa, 2–3 clínicas, 7 usuarios —uno por rol—, 20–40 leads, 5 formularios, 3 campañas, 2 reglas de automatización).

```bash
npm run db:seed
```

Contraseñas demo: `Demo2026!` (y `Admin1234!` para el superadmin).

Para re-ejecutar limpiando todo:

```bash
npm run db:reset
```

**¡Cuidado!** `db:reset` hace `prisma migrate reset --force` que **borra todas las tablas**. Nunca lo ejecutes contra la base de datos de producción.

---

## 5. Índices y rendimiento

Los índices implícitos cubren casos frecuentes:

- `@unique` en `Company.slug`, `User.email`, `Clinic (companyId, slug)`, `UserClinicAccess (userId, clinicId)`, `FormDefinition (companyId, slug)`.
- Relación 1:1 con `@unique` en FK.

Para tráfico alto (> 50k leads por tenant) añade índices explícitos en `schema.prisma`:

```prisma
model Lead {
  // …
  @@index([companyId, status])
  @@index([companyId, createdAt])
  @@index([companyId, clinicId, status])
  @@index([assignedToId])
  @@index([phone])
  @@index([email])
}

model AuditLog {
  @@index([companyId, createdAt])
  @@index([entity, entityId])
  @@index([userId])
}
```

Tras añadirlos: `npx prisma migrate dev --name add_performance_indexes`.

---

## 6. Backups

### Neon

- **Point-in-time recovery** incluido hasta 7 días en plan Launch, 30 días en Scale.
- **Branches** como backups lógicos: crea un branch a partir del estado actual (equivale a un snapshot).
- Backups manuales vía `pg_dump`:

  ```bash
  pg_dump --no-owner --no-acl --format=c \
    "$DIRECT_URL" \
    > backups/dental-leads-$(date +%F).dump
  ```

### Auto-dump semanal (opcional)

Crea un cron en GitHub Actions o Vercel Cron que ejecute `pg_dump` y suba el dump a S3 / R2. Template de ejemplo en `.github/workflows/backup.yml` (no incluido por defecto).

### Restore

```bash
pg_restore --no-owner --no-acl --clean --if-exists \
  -d "$DIRECT_URL" \
  backups/dental-leads-2026-04-24.dump
```

---

## 7. Estrategia de soft-delete

Seguimos soft-delete para entidades importantes (usuarios, clínicas) poniendo `isActive = false` en lugar de borrar. Motivos:

- Evita perder histórico de `Lead.assignedToId` apuntando a usuarios.
- Cumple RGPD con "derecho al olvido" parcial (puedes anonimizar y desactivar sin romper el grafo).
- Las listas de UI filtran por `isActive: true` por defecto.

Las entidades sin soft-delete (notas, eventos, form submissions) se cascadean desde el padre (`onDelete: Cascade`).

Para **anonimización** completa (tras solicitud RGPD):

```ts
await prisma.user.update({
  where: { id },
  data: {
    email: `anonymous+${id}@deleted.local`,
    name: null,
    firstName: null,
    lastName: null,
    phone: null,
    avatar: null,
    isActive: false,
  },
});
```

---

## 8. Retención de datos

La retención se configura en `/settings → RGPD → Retención de datos (días)` (default 365). Recomendamos un cron job que anonimice leads más antiguos que esa ventana **sin consentimiento activo**:

```sql
-- Pseudocódigo, implementable como job BullMQ en V2
UPDATE "Lead"
SET
  "firstName" = 'ANON',
  "lastName"  = NULL,
  "phone"     = NULL,
  "email"     = NULL,
  "initialMessage" = NULL
WHERE
  "companyId" = $1
  AND "createdAt" < NOW() - INTERVAL '365 days'
  AND "gdprConsent" = false;
```

---

## 9. Multi-tenant en una misma BD vs BD por tenant

**Decisión actual:** multi-tenant en una sola BD, filtrando por `companyId`. Pros:

- Mantenimiento mínimo (una migration, una BD).
- Cost-effective en Neon (una instancia compute).
- Permite dashboards globales para SUPERADMIN.

Contras y mitigaciones:

- Un bug en el filtro `companyId` filtra data entre tenants → testing RBAC exhaustivo + revisiones.
- Queries pesadas en un tenant afectan a otros → índices por `companyId` + query timeouts.

Si un día se necesita aislamiento físico por tenant (certificaciones tipo HIPAA), la migración a **schema-per-tenant** es posible manteniendo el mismo Prisma schema.

---

## 10. Prisma Studio

```bash
npm run db:studio
```

Abre un explorador visual en `http://localhost:5555`. Útil para:

- Inspección rápida de datos.
- Editar un registro puntual.
- Debugear foreign keys.

No usar sobre la BD de producción salvo emergencia.
