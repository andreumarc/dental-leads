# Guía de despliegue — Dental Leads

Esta guía describe paso a paso cómo desplegar Dental Leads en **Vercel** con Postgres Neon, que es la combinación oficialmente soportada.

---

## 1. Requisitos previos

- Cuenta en [Vercel](https://vercel.com).
- Cuenta en [Neon](https://neon.tech).
- Repositorio en GitHub / GitLab / Bitbucket con el proyecto.
- `AUTH_SECRET` generado localmente con `npx auth secret` o `openssl rand -base64 32`.

---

## 2. Crear la base de datos en Neon

### 2.1 Crear proyecto

1. Entra en [console.neon.tech](https://console.neon.tech).
2. **New Project**.
3. Settings:
   - **Name**: `dental-leads-prod`
   - **Postgres version**: 16 (recomendado).
   - **Region**: la más cercana a tu deploy Vercel (p. ej. `eu-west-2` London para España).
4. **Create Project**.

### 2.2 Copiar las connection strings

Tras crearse, verás dos URLs:

- **Pooled connection** — termina con `-pooler` en el host → `DATABASE_URL`.
- **Direct connection** — sin `-pooler` → `DIRECT_URL`.

Ambas usan el mismo usuario/password. La pooled es obligatoria en entornos serverless (Vercel functions) porque Neon cierra conexiones inactivas tras unos segundos. La direct es imprescindible para `prisma migrate`.

Ejemplo:

```
DATABASE_URL=postgres://user:pass@ep-example-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgres://user:pass@ep-example.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

### 2.3 Aplicar el schema

Desde tu máquina, con `.env.local` apuntando a Neon:

```bash
npm run db:push
npm run db:seed
```

> **Nota:** en proyectos en producción se recomienda `prisma migrate deploy` con migrations versionadas en lugar de `db:push`. Ver [DATABASE.md](./DATABASE.md) para estrategia de migraciones.

---

## 3. Configurar Vercel

### 3.1 Importar el proyecto

1. En [vercel.com/new](https://vercel.com/new) pulsa **Import Git Repository**.
2. Autoriza acceso al repo si es la primera vez.
3. Selecciona `dental-leads`.

### 3.2 Configuración del proyecto

- **Framework preset**: Next.js (autodetectado).
- **Root Directory**: `./` (default).
- **Build Command**: default (`next build`).
- **Output Directory**: default (`.next`).
- **Install Command**: default (`npm install`).

El `postinstall` hook del `package.json` ejecuta `prisma generate` automáticamente, por lo que no necesitas modificar el build command.

### 3.3 Variables de entorno

En la sección **Environment Variables** añade:

| Variable | Entorno | Valor |
|---|---|---|
| `DATABASE_URL` | Production + Preview | pooled URL de Neon |
| `DIRECT_URL` | Production + Preview | direct URL de Neon |
| `AUTH_SECRET` | Production + Preview + Development | secreto generado |
| `NEXTAUTH_URL` | Production | `https://tu-proyecto.vercel.app` |

Opcionales (si usas integraciones externas):

| Variable | Descripción |
|---|---|
| `WHATSAPP_PROVIDER` | `mock` por defecto, o `meta` / `twilio` |
| `WHATSAPP_ACCESS_TOKEN` | token Meta Business |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número en Meta |
| `WHATSAPP_VERIFY_TOKEN` | token verificación webhook |
| `HUB_JWT_SECRET` | SSO con Hub ImpulsoDent |

> **Buena práctica:** usa branches de Neon para Preview deployments. Cada rama PR puede apuntar a una base de datos aislada, evitando contaminar producción.

### 3.4 Deploy inicial

Click en **Deploy**. El primer build suele tardar 90–150 s. Si falla:

- **Error de Prisma** → revisa que `postinstall` esté ejecutando `prisma generate`.
- **Error `DATABASE_URL` no definida** → comprueba que las env vars están en el scope correcto.
- **Error de migración** → normalmente no corremos migrate en el build de Vercel. Ejecútalas localmente contra la BD de prod.

---

## 4. Poblar la BD de producción

Tras el primer deploy, la BD está vacía. Ejecuta el seed **localmente contra la URL de producción**:

```bash
# Desde tu máquina
DATABASE_URL="postgres://…pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" \
DIRECT_URL="postgres://…eu-west-2.aws.neon.tech/neondb?sslmode=require" \
npm run db:seed
```

O usa Vercel CLI:

```bash
vercel env pull .env.production.local
# Editar el archivo si hace falta, luego:
cp .env.production.local .env.local
npm run db:seed
```

> **Importante:** nunca commitees `.env.production.local` al repo.

---

## 5. Dominio personalizado

1. En el dashboard de Vercel → **Settings → Domains**.
2. Añade tu dominio (p. ej. `leads.impulsodent.com`).
3. Configura los DNS siguiendo las instrucciones de Vercel (CNAME o A record).
4. Actualiza `NEXTAUTH_URL` a la URL final del dominio.
5. Redeploy para propagar la nueva URL.

---

## 6. Post-deploy: checklist

- [ ] Login con usuario demo funciona (`admin@dentalleads.com / Demo2026!`).
- [ ] Se puede crear un lead manualmente.
- [ ] Importación CSV funciona.
- [ ] Se puede crear/editar una clínica.
- [ ] Se puede crear/editar un usuario.
- [ ] Ajustes → RGPD guarda correctamente.
- [ ] Auditoría muestra los eventos de los pasos anteriores.
- [ ] Formulario público `/forms/<slug>` responde en el dominio final.
- [ ] Webhook WhatsApp `/api/webhooks/whatsapp` responde `200` a GET con verify_token válido (si se configura Meta).

---

## 7. Actualizaciones y redeploys

Cada `git push` a la rama principal dispara un deploy de producción. Cada PR genera un deploy de Preview con URL propia.

Para forzar un rebuild sin cambios de código (p. ej. tras actualizar env vars):

- **Vercel UI**: Deployments → último deploy → menú ⋯ → **Redeploy**.
- **CLI**: `vercel --prod`.

---

## 8. Rollback

1. Ve al dashboard de Vercel → **Deployments**.
2. Localiza el deploy estable anterior.
3. Menú ⋯ → **Promote to Production**.

Esto restaura el build anterior instantáneamente sin tocar código.

---

## 9. Logs y monitorización

- **Vercel → Logs** para ver stdout/stderr por deployment (streaming en tiempo real con Vercel CLI: `vercel logs`).
- **Neon → Monitoring** para uso de CPU, conexiones activas y queries lentas.
- **Next.js built-in**: `console.error` en API routes aparece en logs de Vercel.

Para alertas avanzadas se puede integrar Sentry, LogSnag, Axiom, o Better Stack vía env vars y SDK.

---

## 10. Troubleshooting

### "Too many connections"

Vercel ejecuta funciones serverless que abren conexiones cortas. Si ves `too many connections for role`, asegúrate de usar la URL **pooled** en `DATABASE_URL`. Neon pooler gestiona hasta 10k conexiones efímeras sobre ~100 reales.

### "SessionNotFound" o "Invalid JWT"

- Comprueba que `AUTH_SECRET` coincide en todos los entornos.
- Verifica `NEXTAUTH_URL` (sin slash final, `https://`).
- Tras cambiar `AUTH_SECRET`, todos los JWTs antiguos dejarán de funcionar — los usuarios tendrán que volver a iniciar sesión.

### Prisma Client desactualizado

Si al hacer deploy ves `Unknown arg "foo" on …`, tu cliente Prisma está stale:

```bash
npm run db:generate
git add .
git commit -m "chore: regenerate prisma client"
git push
```

### Build falla por tipo

`next build` corre `tsc` en modo strict. Si falla:

```bash
npx tsc --noEmit
```

para ver los errores localmente y corregirlos.

---

## 11. Coste estimado

| Recurso | Plan | Coste |
|---|---|---|
| Vercel Hobby | hasta 100 GB-hr/mes, 1 team member | Gratis |
| Vercel Pro | producción, team | $20/mes por miembro |
| Neon Free | 0.5 GB, compute 191h/mes | Gratis |
| Neon Launch | 10 GB, autoscaling, branches | $19/mes |
| Dominio `.com` | GoDaddy / Cloudflare | ~$12/año |

Una clínica pequeña puede operar dentro del tier gratuito sin problema en arranque; a partir de ~5k leads/mes conviene Neon Launch y Vercel Pro.
