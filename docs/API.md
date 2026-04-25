# API Reference — Dental Leads

Dental Leads expone una API REST interna (para la propia app y clientes autenticados) y una pequeña superficie pública para integraciones (webhooks, formularios, importación).

Convenciones generales:

- Todas las rutas responden JSON `{ success: true, data: ... }` o `{ success: false, error: "..." }`.
- Status codes: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `422` Unprocessable Entity, `500` Internal Server Error.
- Auth interna vía cookie de sesión (Auth.js JWT). El middleware en `src/middleware.ts` redirige las rutas `(dashboard)` no autenticadas.
- Toda ruta privada: `session check → permission check → zod validate → prisma query → audit log → response`.
- Todas las queries Prisma están scope-adas por `companyId` (salvo `SUPERADMIN`).

---

## 1. Auth

### `POST /api/auth/signin`
Manejado por Auth.js. No se invoca directamente.

### `POST /api/auth/signout`
Manejado por Auth.js.

---

## 2. Leads

### `GET /api/leads`

Listado paginado con filtros.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `search` | string | Busca en firstName, lastName, phone, email |
| `status` | repetible | Filtra por LeadStatus (ej. `?status=NUEVO&status=ASIGNADO`) |
| `priority` | repetible | LeadPriority |
| `channelId` | repetible | IDs de canal |
| `clinicId` | repetible | IDs de clínica |
| `assignedToId` | repetible | IDs de usuario asignado |
| `dateFrom` | ISO date | Límite inferior de createdAt |
| `dateTo` | ISO date | Límite superior |
| `page` | number | Default 1 |
| `pageSize` | number | Default 20, max 100 |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clq...",
      "firstName": "María",
      "lastName": "García",
      "phone": "+34600111222",
      "email": "maria@email.com",
      "treatment": "Ortodoncia",
      "status": "NUEVO",
      "priority": "ALTA",
      "clinic": { "id": "...", "name": "Clínica Centro", "city": "Madrid" },
      "assignedTo": null,
      "_count": { "appointments": 0, "notes": 0, "events": 1 },
      "createdAt": "2026-04-24T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 148, "totalPages": 8 }
}
```

### `POST /api/leads`

Crear lead manualmente.

**Body:**

```json
{
  "firstName": "string",
  "lastName": "string?",
  "phone": "string",
  "email": "string?",
  "treatment": "string?",
  "channelId": "string?",
  "clinicId": "string",
  "priority": "BAJA|MEDIA|ALTA|URGENTE",
  "initialMessage": "string?",
  "gdprConsent": "boolean"
}
```

**Response 201:** `{ success: true, data: <Lead> }`.

### `GET /api/leads/[id]`
Ficha completa: lead + tags, notes, events, appointments, assignmentHistory.

### `PATCH /api/leads/[id]`
Actualizar campos del lead. Permission: `leads:edit`.

### `DELETE /api/leads/[id]`
Soft-delete. Permission: `leads:delete`.

### `POST /api/leads/import`

Importación en batch desde CSV pre-parseado.

**Body:**

```json
{
  "clinicId": "string",
  "rows": [
    { "firstName": "...", "lastName": "...", "phone": "...", "email": "...", "treatment": "...", "priority": "MEDIA" }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "created": 42,
    "total": 45,
    "errors": ["Fila 12: teléfono inválido \"ABC\" — omitida", ...]
  }
}
```

Permission: `leads:import`.

---

## 3. Users

### `GET /api/users`
Lista usuarios de la empresa. Permission `users:view`.

Include: `clinicAccess` (con clínica), `_count` (clinicAccess, assignedLeads).

### `POST /api/users`

**Body:**

```json
{
  "name": "Ana Pérez",
  "email": "ana@empresa.com",
  "role": "RECEPCION",
  "password": "SecurePass2026!",
  "clinicIds": ["clinicid1", "clinicid2"],
  "isActive": true
}
```

- Hashea la password con `bcryptjs (rounds=10)`.
- Guarda el hash en `Account.access_token` (provider `credentials`).
- Crea `UserClinicAccess` para cada clinicId.
- Permission: `users:create`. Conflict `409` si email existe.

### `GET /api/users/[id]`
Ficha. Permission `users:view`.

### `PATCH /api/users/[id]`

**Body (todos opcionales):**

```json
{
  "name": "string",
  "role": "UserRole",
  "password": "string (min 8)",
  "clinicIds": ["string"],
  "isActive": "boolean"
}
```

- No puede desactivar ni cambiar rol a sí mismo (`400`).
- Sustituye las filas `UserClinicAccess` si `clinicIds` está presente.
- Sustituye el hash en `Account.access_token` si `password` está presente.

Permission: `users:edit`.

### `DELETE /api/users/[id]`
Soft-delete (`isActive=false`). No permite auto-eliminarse. Permission: `users:delete`.

---

## 4. Clinics

### `GET /api/clinics`
Lista. Permission `clinics:view`. Include `_count: { leads, userAccess }`.

### `POST /api/clinics`

**Body:**

```json
{
  "name": "Clínica Madrid Centro",
  "slug": "madrid-centro",
  "address": "Gran Vía 1",
  "city": "Madrid",
  "province": "Madrid",
  "phone": "+34910000000",
  "email": "centro@clinic.com",
  "website": "https://...",
  "isActive": true,
  "config": { "workingHoursEnabled": true, "defaultReception": false }
}
```

- Slug único dentro de la empresa (`409` si duplicado).
- Crea `ClinicSettings` si se envía `config`.

Permission: `clinics:create`.

### `GET /api/clinics/[id]`
Ficha + settings + counts.

### `PATCH /api/clinics/[id]`
Actualiza campos + settings. Permission: `clinics:edit`.

### `DELETE /api/clinics/[id]`
Soft-delete. Permission: `clinics:delete` (sólo SUPERADMIN).

---

## 5. Channels

### `GET /api/channels`
Lista canales con integrationAccount y counts. Query opcional `?type=WHATSAPP`.

### `POST /api/channels`

**Body:**

```json
{
  "name": "WhatsApp centro",
  "type": "WHATSAPP|FORM_WEB|LANDING|MANUAL|CALLCENTER|CSV_IMPORT|WEBHOOK|GENERIC",
  "clinicId": "string?",
  "config": { }
}
```

---

## 6. Automations

### `GET /api/automations`
Lista reglas de la empresa. Permission `automations:view`.

### `POST /api/automations`

**Body:**

```json
{
  "name": "string",
  "trigger": { "type": "LEAD_CREADO | LEAD_SIN_RESPUESTA | ..." },
  "conditions": [{ "field": "...", "operator": "equals|contains|in|...", "value": "..." }],
  "actions": [{ "type": "ASIGNAR_A|CAMBIAR_ESTADO|AÑADIR_ETIQUETA|...", "params": {} }],
  "isActive": true
}
```

### `GET /api/automations/[id]`
### `PATCH /api/automations/[id]`
### `DELETE /api/automations/[id]`
Permission: `automations:edit|delete`.

---

## 7. Settings

### `GET /api/settings`
Devuelve `{ company, settings }`. Permission `settings:view`.

### `POST /api/settings`

Upsert de `CompanySettings`.

**Body (todos opcionales):**

```json
{
  "timezone": "Europe/Madrid",
  "language": "es",
  "defaultLeadAssignment": "userId|null",
  "responseTimeAlert": 60,
  "duplicateDetection": true,
  "gdprRequired": true,
  "notifications": {
    "newLead": true,
    "leadNoResponse": true,
    "appointmentConfirmed": true,
    "leadAssigned": true,
    "gdprText": "...",
    "gdprUrl": "...",
    "retentionDays": 365,
    "country": "ES"
  }
}
```

`notifications` hace merge con el valor existente. Permission: `settings:editCompany`.

---

## 8. Audit

### `GET /api/audit`

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `page` | number | Default 1 |
| `perPage` | number | Default 25, max 100 |
| `action` | AuditAction | Filtra por acción |
| `entity` | string | Filtra por entidad (`Lead`, `User`, etc.) |
| `userId` | string | |
| `from` | ISO date | |
| `to` | ISO date | |
| `format` | `csv` | Devuelve CSV descargable (requiere `audit:export`) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 1234,
    "page": 1,
    "perPage": 25,
    "totalPages": 50
  }
}
```

---

## 9. Forms (privado)

### `GET /api/forms`
Lista formularios.

### `POST /api/forms`
Crea form con fields.

### `GET|PATCH|DELETE /api/forms/[id]`
CRUD estándar.

---

## 10. Appointments

### `GET /api/appointments`
Lista con filtros por status, clinicId, leadId, rango de fechas.

### `POST /api/appointments`

```json
{
  "leadId": "string",
  "clinicId": "string?",
  "userId": "string?",
  "treatment": "string?",
  "status": "SOLICITADA",
  "proposedAt": "ISO?",
  "scheduledAt": "ISO?",
  "duration": 30,
  "notes": "string?"
}
```

### `GET|PATCH|DELETE /api/appointments/[id]`

---

## 11. Dashboard

### `GET /api/dashboard/stats`
KPIs agregados: totales por estado, conversión %, tiempo de respuesta medio, leads por canal, pipeline.

---

## 12. Endpoints públicos

### `POST /api/public/forms/[slug]`

Submit de formulario público. No requiere auth.

**Body:** depende del `FormDefinition`. Ejemplo:

```json
{
  "firstName": "...",
  "phone": "...",
  "email": "...",
  "gdprConsent": true
}
```

Crea un `Lead` + `FormSubmission` + `LeadEvent`.

### `POST /api/public/import?companyId=...&clinicId=...`

Multipart con archivo CSV. Ver [INTEGRATIONS.md](./INTEGRATIONS.md).

### `GET /api/webhooks/whatsapp?hub.mode=subscribe&...`

Webhook verification de Meta Business Platform. Responde con `hub.challenge` si el verify token coincide.

### `POST /api/webhooks/whatsapp`

Recibe eventos de WhatsApp (mensajes entrantes, status updates). Crea/actualiza `Lead`, `Conversation`, `Message`.

---

## 13. Errores comunes

| Status | Motivo típico |
|---|---|
| 401 | Sin sesión o JWT expirado |
| 403 | Rol sin permiso para el recurso/acción, o sin `companyId` |
| 404 | Recurso no existe o no pertenece a la empresa |
| 409 | Conflicto: email duplicado, slug duplicado |
| 422 | Payload no válido (devuelve `details` con Zod flatten) |
| 500 | Error interno — revisa logs del servidor |

---

## 14. Rate limiting

Actualmente no hay rate limit implementado en Next.js. Se recomienda:

- Usar Vercel WAF o Cloudflare rate rules para endpoints públicos.
- Implementar `@upstash/ratelimit` en `middleware.ts` para endpoints `/api/public/*` y `/api/webhooks/*`.

---

## 15. Observabilidad

- Logs en consola vía `console.error("[METHOD /api/...]", error)`.
- Visible en Vercel → Logs por deployment.
- Para producción: integrar Sentry o Axiom con wrapper en las API routes.
