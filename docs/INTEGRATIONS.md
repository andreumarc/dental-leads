# Guía de integraciones — Dental Leads

Dental Leads está diseñado para recibir leads desde múltiples fuentes. Esta guía cubre las integraciones soportadas y cómo activarlas.

---

## 1. WhatsApp

Dental Leads usa **adapter pattern** para WhatsApp. El adaptador se selecciona con la variable `WHATSAPP_PROVIDER`:

| Valor | Descripción |
|---|---|
| `mock` (default) | Respuestas simuladas en memoria, útil para desarrollo. |
| `meta` | Meta Business Platform (WhatsApp Cloud API). |
| `twilio` | Twilio WhatsApp Sandbox o números productivos. |

El código de los adaptadores vive en `src/adapters/whatsapp/`.

### 1.1 Provider: Meta Business Platform

**Requisitos:**

- Cuenta Meta Business verificada.
- Número de WhatsApp asociado.
- Acceso a [developers.facebook.com](https://developers.facebook.com).

**Pasos:**

1. Crea una app en Meta for Developers → **WhatsApp → API Setup**.
2. Anota el `PHONE_NUMBER_ID` y genera un **System User access token** permanente.
3. Configura variables de entorno:

   ```
   WHATSAPP_PROVIDER=meta
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_VERIFY_TOKEN=un-secreto-que-invente
   ```

4. En Meta → **Webhooks → WhatsApp**, añade el webhook:
   - **Callback URL**: `https://tu-dominio.com/api/webhooks/whatsapp`
   - **Verify Token**: el mismo de `WHATSAPP_VERIFY_TOKEN`.
   - Suscríbete al evento `messages`.

5. Prueba enviando un mensaje al número de WhatsApp. Deberías ver un nuevo `Lead` en Dental Leads con canal WhatsApp.

**Flujo interno:**

- `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` → responde 200 con el challenge si verify token coincide.
- `POST /api/webhooks/whatsapp` → parsea el payload, busca/crea `Lead` por teléfono, abre o actualiza `Conversation`, guarda `Message`.

### 1.2 Provider: Twilio

**Requisitos:**

- Cuenta Twilio con WhatsApp approved sender (o Sandbox para dev).

**Pasos:**

1. En la consola Twilio → **Messaging → Services → Settings** anota `Account SID` y `Auth Token`.
2. Configura variables:

   ```
   WHATSAPP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   ```

3. En Twilio → **WhatsApp Senders → Sandbox / Sender**, set Inbound URL a `https://tu-dominio.com/api/webhooks/whatsapp?provider=twilio`.

### 1.3 Provider: Mock (desarrollo)

Por defecto (`WHATSAPP_PROVIDER=mock`). No requiere configuración. Cualquier llamada al adaptador devuelve una respuesta sintética. Útil para demo + tests E2E.

### 1.4 Enviar mensajes salientes

Desde la ficha de lead (`/leads/[id]`) hay un compositor de mensajes. Internamente llama a:

```ts
import { getWhatsAppAdapter } from "@/adapters/whatsapp";

const adapter = getWhatsAppAdapter();
await adapter.sendMessage({ to: lead.phone, content: "Hola!" });
```

El adapter `mock` guarda el mensaje en `Message` con `direction: outbound` pero no envía nada externo.

---

## 2. Formularios embebibles

Crea un `FormDefinition` desde la UI `/forms`. Cada form tiene:

- `name`, `slug`, `description`.
- Lista de `FormField`: `name`, `label`, `type` (text, email, phone, select, textarea, checkbox), `required`, `options` (para select), `mapToLead` (campo de `Lead` al que mapea).

### 2.1 Embed

La UI te da un snippet:

```html
<!-- IFrame simple -->
<iframe
  src="https://tu-dominio.com/forms/madrid-centro-ortodoncia"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
></iframe>
```

O bien un script JS ligero que monta el form inline:

```html
<div id="dl-form"></div>
<script
  defer
  src="https://tu-dominio.com/embed.js"
  data-form-slug="madrid-centro-ortodoncia"
  data-target="#dl-form"
></script>
```

### 2.2 Submit endpoint

`POST /api/public/forms/[slug]`

Body: JSON con los `name` de los fields. Ejemplo:

```json
{
  "firstName": "María",
  "lastName": "García",
  "phone": "+34612345678",
  "email": "maria@example.com",
  "treatment": "Implante",
  "gdprConsent": true
}
```

Response 200:

```json
{ "success": true, "data": { "leadId": "clq..." } }
```

Se crea:

1. `FormSubmission` con `data` JSON completo, `ipAddress` y `userAgent`.
2. `Lead` con los campos mapeados (`mapToLead`).
3. `LeadEvent` tipo `CREADO` asociado.
4. Disparo del motor de automatizaciones.

### 2.3 Redirección post-submit

Configura `redirectUrl` en el `FormDefinition` y la UI pública redirigirá tras un submit exitoso. Útil para trackear conversiones en Google Ads / Meta Pixel.

### 2.4 Webhook forwarding

Si configuras `FormDefinition.webhookUrl`, tras cada submit se hace un `POST` de la data al URL especificado (útil para mandar a Zapier, Make, Google Sheets, CRM externo).

---

## 3. Importación CSV

### 3.1 Vía UI

`/leads/import` — drag & drop de un archivo CSV. La UI:

1. Parsea las primeras 5 filas client-side.
2. Muestra un mapeador (columna CSV → campo Lead).
3. Preview con los valores mapeados.
4. POST a `/api/leads/import` con `{ rows, clinicId }`.

Solo el campo **firstName** es obligatorio. El resto (`lastName`, `phone`, `email`, `treatment`, `priority`) son opcionales.

Validaciones:

- Teléfono: 7–20 dígitos tras limpiar espacios y símbolos.
- Email: debe contener `@`.
- Prioridad: acepta `BAJA|MEDIA|ALTA|URGENTE` (case-insensitive), default `MEDIA`.

### 3.2 Vía API pública

`POST /api/public/import?companyId=<id>&clinicId=<id>` multipart con campo `file` (CSV).

Útil para jobs cron o integraciones externas con API key (ver sección 6).

```bash
curl -X POST "https://tu-dominio.com/api/public/import?companyId=abc&clinicId=xyz" \
  -F "file=@leads.csv"
```

Response:

```json
{
  "success": true,
  "created": 120,
  "total": 123,
  "errors": ["Fila 15: sin nombre — omitida", ...],
  "message": "120 leads creados correctamente, 3 omitidos."
}
```

### 3.3 Formato CSV

La primera fila son headers. Headers reconocidos automáticamente (sin mapeo manual):

| Campo Lead | Headers aceptados |
|---|---|
| firstName | `nombre`, `name`, `first_name`, `firstname` |
| lastName | `apellidos`, `apellido`, `last_name`, `lastname` |
| phone | `telefono`, `teléfono`, `phone`, `mobile`, `celular`, `tel` |
| email | `email`, `correo`, `mail` |
| treatment | `tratamiento`, `treatment`, `servicio`, `service` |

Soporta valores con comillas dobles para escapar comas:

```csv
nombre,telefono,treatment
María,+34600111222,"Blanqueamiento dental, grado 3"
```

---

## 4. Webhooks entrantes genéricos

Cualquier canal tipo `WEBHOOK` puede recibir POSTs en `/api/channels/[id]/webhook`. El payload se valida contra el mapping definido en `Channel.config.mapping` (si existe) y crea un `Lead`.

Ejemplo de config:

```json
{
  "mapping": {
    "firstName": "$.contact.firstName",
    "phone": "$.contact.phone",
    "treatment": "$.details.product",
    "utmSource": "$.tracking.source"
  }
}
```

Se parsea con JSONPath-like resolver.

---

## 5. Automatizaciones

Motor en `src/lib/automations/engine.ts`. Se dispara:

- Tras crear un lead (`LEAD_CREADO`).
- Tras actualizar un lead (`LEAD_ACTUALIZADO`).
- Por cron detectando leads sin respuesta (`LEAD_SIN_RESPUESTA`).
- Tras crear una cita (`CITA_CREADA`).
- Tras un form submission (`FORMULARIO_RECIBIDO`).

Cada regla tiene:

- **Trigger**: tipo de evento.
- **Conditions**: lista de `{ field, operator, value }` AND-linked.
- **Actions**: lista de `{ type, params }` ejecutadas en orden.

Acciones disponibles:

- `ASIGNAR_A` → asigna lead a un `userId`.
- `CAMBIAR_ESTADO` → fija `Lead.status`.
- `AÑADIR_ETIQUETA` → crea un `LeadTag`.
- `ENVIAR_ALERTA` → crea un `LeadEvent` tipo `ALERTA` con mensaje.
- `NOTIFICAR_USUARIO` → placeholder (V2 enviará email / push).

Las plantillas predefinidas se encuentran en `RULE_TEMPLATES` (ver en la página `/automations`).

### Ejemplo real

**Regla:** "Leads de ortodoncia van al comercial especializado".

```json
{
  "name": "Autoasignar ortodoncia",
  "trigger": { "type": "LEAD_CREADO" },
  "conditions": [
    { "field": "treatment", "operator": "contains", "value": "ortodoncia" }
  ],
  "actions": [
    { "type": "ASIGNAR_A", "params": { "userId": "userid-del-ortodoncista" } },
    { "type": "AÑADIR_ETIQUETA", "params": { "tag": "ortodoncia" } },
    { "type": "CAMBIAR_ESTADO", "params": { "status": "ASIGNADO" } }
  ],
  "isActive": true
}
```

---

## 6. API Keys (roadmap)

En el MVP actual, los endpoints públicos (`/api/public/*`) aceptan `companyId` en query string sin autenticación fuerte. Para producción real se recomienda:

1. Implementar modelo `ApiKey` (hash + scopes + lastUsedAt).
2. Validar `Authorization: Bearer dl_live_...` en endpoints públicos.
3. Rotación desde `/settings → Integraciones → API Keys`.

Actualmente la UI muestra un placeholder `dl_live_••••••••1234`. La columna backend está prevista pero no operativa hasta V2.

---

## 7. SSO con Hub ImpulsoDent

Dental Leads puede integrarse como sub-app del Hub central ImpulsoDent usando JWT compartido.

**Variables:**

```
HUB_JWT_SECRET=<mismo secreto que el hub>
HUB_SYNC_ENDPOINT=https://hub.impulsodent.com/api/sync
```

**Endpoints de sincronización (entrantes):**

- `POST /api/sync/user` — crea/actualiza usuario desde el hub.
- `POST /api/sync/company` — crea/actualiza empresa.
- `POST /api/sync/clinics` — sync batch de clínicas (`clinic_ids: string[] | 'ALL'`).

Ver [proyecto Hub Multi-tenancy](https://github.com/andreumarc) (privado) para el contrato completo.

---

## 8. Analítica y tracking

### UTMs

Los endpoints públicos aceptan UTMs:

```
/forms/my-form?utm_source=google&utm_medium=cpc&utm_campaign=ortodoncia-2026
```

Se persisten en `Lead.utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` y se muestran en la ficha del lead.

### Eventos en ficha de lead

Cada interacción relevante crea un `LeadEvent` con tipo y `metadata` JSON. Esto alimenta el timeline de la ficha y permite auditar fácilmente conversiones.

### Google Ads / Meta Pixel

Añade los píxeles a la página de "gracias" post-submit configurando `FormDefinition.redirectUrl`. En el futuro se añadirá conversión server-side via webhook al Conversion API.

---

## 9. Datos salientes

Para enviar leads a sistemas externos (CRM, Google Sheets, Slack):

1. **Webhook forwarding** en forms (sección 2.4).
2. **Zapier / Make** consumiendo los endpoints de la API interna con token de sesión (no recomendado) o con API keys (V2).
3. **Exportación CSV** desde la bandeja de leads (botón "Exportar" — filtra selección actual).

---

## 10. Testing de integraciones

### Script de ping WhatsApp

```bash
curl -X POST https://tu-dominio.com/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "34600111222",
            "type": "text",
            "text": { "body": "Hola, quiero información de ortodoncia" }
          }]
        }
      }]
    }]
  }'
```

Deberías ver un lead nuevo en la bandeja.

### Script de submit de form

```bash
curl -X POST https://tu-dominio.com/api/public/forms/mi-form-slug \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "phone": "+34600000000",
    "email": "test@example.com",
    "gdprConsent": true
  }'
```
