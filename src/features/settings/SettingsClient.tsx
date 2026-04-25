"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanySettings } from "@prisma/client";
import {
  Settings as SettingsIcon,
  Bell,
  Plug,
  Shield,
  Copy,
  Check,
  Building2,
  Loader2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

type CompanyLite = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  domain: string | null;
  plan: string;
  isActive: boolean;
};

interface SettingsClientProps {
  company: CompanyLite;
  settings: CompanySettings | null;
  canEdit: boolean;
}

type Tab = "general" | "notifications" | "integrations" | "gdpr";

type NotificationsShape = {
  newLead?: boolean;
  leadNoResponse?: boolean;
  appointmentConfirmed?: boolean;
  leadAssigned?: boolean;
  gdprText?: string;
  gdprUrl?: string;
  retentionDays?: number;
  country?: string;
};

const DEFAULT_GDPR_TEXT =
  "Acepto la política de privacidad y el tratamiento de mis datos conforme al RGPD.";

export function SettingsClient({
  company,
  settings,
  canEdit,
}: SettingsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const notifications = (settings?.notifications as NotificationsShape | null) ?? {};

  // ─── General state
  const [timezone, setTimezone] = useState(settings?.timezone ?? "Europe/Madrid");
  const [language, setLanguage] = useState(settings?.language ?? "es");
  const [country, setCountry] = useState(notifications.country ?? "ES");

  // ─── Notifications state
  const [notifNewLead, setNotifNewLead] = useState(
    notifications.newLead ?? true
  );
  const [notifNoResponse, setNotifNoResponse] = useState(
    notifications.leadNoResponse ?? true
  );
  const [notifAppointment, setNotifAppointment] = useState(
    notifications.appointmentConfirmed ?? true
  );
  const [notifAssigned, setNotifAssigned] = useState(
    notifications.leadAssigned ?? true
  );
  const [responseTimeAlert, setResponseTimeAlert] = useState(
    settings?.responseTimeAlert ?? 60
  );

  // ─── RGPD state
  const [gdprText, setGdprText] = useState(
    notifications.gdprText ?? DEFAULT_GDPR_TEXT
  );
  const [gdprUrl, setGdprUrl] = useState(notifications.gdprUrl ?? "");
  const [retentionDays, setRetentionDays] = useState<number>(
    notifications.retentionDays ?? 365
  );
  const [gdprRequired, setGdprRequired] = useState(
    settings?.gdprRequired ?? true
  );
  const [duplicateDetection, setDuplicateDetection] = useState(
    settings?.duplicateDetection ?? true
  );

  const save = async (changes: {
    timezone?: string;
    language?: string;
    responseTimeAlert?: number;
    gdprRequired?: boolean;
    duplicateDetection?: boolean;
    notifications?: NotificationsShape;
  }) => {
    if (!canEdit) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error guardando");
      }
      setNotice("Guardado correctamente");
      router.refresh();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const saveGeneral = () =>
    save({
      timezone,
      language,
      notifications: { ...notifications, country },
    });

  const saveNotifications = () =>
    save({
      responseTimeAlert,
      notifications: {
        ...notifications,
        newLead: notifNewLead,
        leadNoResponse: notifNoResponse,
        appointmentConfirmed: notifAppointment,
        leadAssigned: notifAssigned,
      },
    });

  const saveGdpr = () =>
    save({
      gdprRequired,
      duplicateDetection,
      notifications: {
        ...notifications,
        gdprText,
        gdprUrl,
        retentionDays: Number(retentionDays) || 365,
      },
    });

  const tabs: Array<{ id: Tab; label: string; icon: typeof SettingsIcon }> = [
    { id: "general", label: "General", icon: Building2 },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "integrations", label: "Integraciones", icon: Plug },
    { id: "gdpr", label: "RGPD", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes"
        description="Configura tu empresa, notificaciones y RGPD."
      />

      {/* Tab bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">
          {notice}
        </div>
      )}

      {/* GENERAL */}
      {tab === "general" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-neutral-900">
            Datos de la empresa
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre de la empresa">
              <input
                type="text"
                value={company.name}
                disabled
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
              />
            </Field>
            <Field label="Slug">
              <input
                type="text"
                value={company.slug}
                disabled
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-700"
              />
            </Field>
            <Field label="Plan">
              <div className="flex items-center">
                <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium uppercase text-purple-800">
                  {company.plan}
                </span>
              </div>
            </Field>
            <Field label="País">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              >
                <option value="ES">España</option>
                <option value="MX">México</option>
                <option value="AR">Argentina</option>
                <option value="CO">Colombia</option>
                <option value="CL">Chile</option>
                <option value="PE">Perú</option>
              </select>
            </Field>
            <Field label="Zona horaria">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              >
                <option value="Europe/Madrid">Europe/Madrid</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Argentina/Buenos_Aires">
                  America/Argentina/Buenos_Aires
                </option>
                <option value="America/Bogota">America/Bogota</option>
              </select>
            </Field>
            <Field label="Idioma">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
          {canEdit && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveGeneral}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-neutral-900">
            Preferencias de notificación
          </h2>
          <div className="space-y-2">
            <Toggle
              label="Nuevo lead"
              description="Recibe un aviso cuando entre un lead."
              checked={notifNewLead}
              onChange={setNotifNewLead}
              disabled={!canEdit}
            />
            <Toggle
              label="Lead sin responder (>2h)"
              description="Avisa cuando un lead lleva más de 2 horas sin respuesta."
              checked={notifNoResponse}
              onChange={setNotifNoResponse}
              disabled={!canEdit}
            />
            <Toggle
              label="Cita confirmada"
              description="Notificar cuando un paciente confirma una cita."
              checked={notifAppointment}
              onChange={setNotifAppointment}
              disabled={!canEdit}
            />
            <Toggle
              label="Lead asignado"
              description="Avisa al usuario cuando se le asigna un lead."
              checked={notifAssigned}
              onChange={setNotifAssigned}
              disabled={!canEdit}
            />
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <Field label="Tiempo máximo de respuesta (minutos)">
              <input
                type="number"
                min={1}
                value={responseTimeAlert}
                onChange={(e) =>
                  setResponseTimeAlert(parseInt(e.target.value, 10) || 60)
                }
                disabled={!canEdit}
                className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              />
            </Field>
          </div>

          {canEdit && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveNotifications}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      )}

      {/* INTEGRATIONS */}
      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    WhatsApp Business
                  </h3>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    Conecta tu número y recibe los leads directamente.
                  </p>
                </div>
              </div>
              <a
                href="/channels"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-teal-500 hover:text-teal-700"
              >
                Configurar
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-neutral-900">
              Endpoints públicos
            </h3>
            <div className="space-y-3">
              <WebhookRow
                label="WhatsApp webhook"
                pathSuffix="/api/webhooks/whatsapp"
              />
              <WebhookRow
                label="Formularios públicos"
                pathSuffix="/api/public/forms/[slug]"
              />
              <WebhookRow
                label="Importación CSV"
                pathSuffix={`/api/public/import?companyId=${company.id}`}
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-neutral-900">
              API Key
            </h3>
            <ApiKeyRow masked="dl_live_••••••••1234" />
            <p className="mt-3 text-xs text-neutral-500">
              Las API keys permiten a sistemas externos crear leads vía REST.
              Rota la clave si sospechas uso indebido.
            </p>
          </div>
        </div>
      )}

      {/* GDPR */}
      {tab === "gdpr" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-neutral-900">
            RGPD y protección de datos
          </h2>

          <div className="space-y-4">
            <Toggle
              label="Consentimiento RGPD obligatorio"
              description="Los formularios públicos requerirán consentimiento explícito."
              checked={gdprRequired}
              onChange={setGdprRequired}
              disabled={!canEdit}
            />
            <Toggle
              label="Detección de duplicados"
              description="Evitar leads duplicados por teléfono/email."
              checked={duplicateDetection}
              onChange={setDuplicateDetection}
              disabled={!canEdit}
            />

            <Field label="Texto de consentimiento en formularios">
              <textarea
                rows={3}
                value={gdprText}
                onChange={(e) => setGdprText(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              />
            </Field>

            <Field label="URL de política de privacidad">
              <input
                type="url"
                value={gdprUrl}
                onChange={(e) => setGdprUrl(e.target.value)}
                placeholder="https://tudominio.com/privacidad"
                disabled={!canEdit}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              />
            </Field>

            <Field label="Retención de datos (días)">
              <input
                type="number"
                min={30}
                max={3650}
                value={retentionDays}
                onChange={(e) =>
                  setRetentionDays(parseInt(e.target.value, 10) || 365)
                }
                disabled={!canEdit}
                className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-50"
              />
            </Field>
          </div>

          {canEdit && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveGdpr}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition ${
        disabled ? "opacity-70" : "hover:bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-neutral-900">{label}</div>
        <div className="text-xs text-neutral-500">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-block h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition ${
          checked ? "bg-teal-600" : "bg-neutral-300"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </label>
  );
}

function WebhookRow({
  label,
  pathSuffix,
}: {
  label: string;
  pathSuffix: string;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathSuffix}`
      : pathSuffix;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </div>
        <div className="truncate font-mono text-xs text-neutral-700">{url}</div>
      </div>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-teal-500 hover:text-teal-700"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copiado
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </>
        )}
      </button>
    </div>
  );
}

function ApiKeyRow({ masked }: { masked: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="min-w-0 flex-1 font-mono text-sm text-neutral-700">
        {masked}
      </div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(masked);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-teal-500 hover:text-teal-700"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copiado
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </>
        )}
      </button>
    </div>
  );
}
