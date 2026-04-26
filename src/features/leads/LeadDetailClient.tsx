"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  MonitorSmartphone,
  Upload,
  Webhook,
  Users,
  Plus,
  ArrowRight,
  User,
  Calendar,
  Lock,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldOff,
  Loader2,
  Clock,
  Tag,
  X,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";
import { StatusChangeModal } from "./StatusChangeModal";
import { AppointmentModal } from "@/features/appointments/AppointmentModal";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LeadUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  email: string;
}

interface LeadNote {
  id: string;
  content: string;
  isPrivate: boolean;
  createdAt: Date | string;
  user: LeadUser;
}

interface LeadEvent {
  id: string;
  type: string;
  description: string;
  createdAt: Date | string;
  user: LeadUser | null;
  metadata?: Record<string, unknown> | null;
}

interface LeadTag {
  id: string;
  name: string;
  color: string;
}

interface Appointment {
  id: string;
  treatment: string | null;
  specialty: string | null;
  status: string;
  proposedAt: Date | string | null;
  confirmedAt: Date | string | null;
  notes: string | null;
  clinic: { id: string; name: string } | null;
  user: { id: string; name: string | null } | null;
}

interface FullLead {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  status: string;
  priority: string;
  gdprConsent: boolean;
  gdprConsentDate: Date | string | null;
  companyId: string;
  clinicId: string | null;
  assignedToId: string | null;
  channelId: string | null;
  origin: string | null;
  channel: string | null;
  subChannel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  initialMessage: string | null;
  firstResponseAt: Date | string | null;
  lastInteractionAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  clinic: {
    id: string; name: string; city: string | null; phone: string | null; email: string | null;
  } | null;
  assignedTo: (LeadUser & { role: string }) | null;
  createdBy: LeadUser | null;
  channelRef: { id: string; name: string; type: string } | null;
  campaign: { id: string; name: string } | null;
  tags: LeadTag[];
  events: LeadEvent[];
  notes: LeadNote[];
  appointments: Appointment[];
  _count: { events: number; notes: number; appointments: number; conversations: number };
}

interface SimpleUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

interface LeadDetailClientProps {
  lead: FullLead;
  users: SimpleUser[];
  currentUserId: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  NUEVO: { label: "Nuevo", bg: "bg-blue-100", text: "text-blue-700" },
  SIN_ASIGNAR: { label: "Sin asignar", bg: "bg-neutral-100", text: "text-neutral-600" },
  ASIGNADO: { label: "Asignado", bg: "bg-indigo-100", text: "text-indigo-700" },
  PENDIENTE_RESPUESTA: { label: "Pendiente respuesta", bg: "bg-yellow-100", text: "text-yellow-700" },
  RESPONDIDO: { label: "Respondido", bg: "bg-green-100", text: "text-green-700" },
  PENDIENTE_LLAMADA: { label: "Pend. llamada", bg: "bg-orange-100", text: "text-orange-700" },
  EN_SEGUIMIENTO: { label: "En seguimiento", bg: "bg-purple-100", text: "text-purple-700" },
  CITA_SOLICITADA: { label: "Cita solicitada", bg: "bg-teal-100", text: "text-teal-700" },
  CITA_PROPUESTA: { label: "Cita propuesta", bg: "bg-teal-100", text: "text-teal-600" },
  CITA_CONFIRMADA: { label: "Cita confirmada", bg: "bg-teal-100", text: "text-teal-800" },
  NO_LOCALIZADO: { label: "No localizado", bg: "bg-neutral-100", text: "text-neutral-500" },
  NO_INTERESADO: { label: "No interesado", bg: "bg-red-100", text: "text-red-600" },
  DUPLICADO: { label: "Duplicado", bg: "bg-neutral-100", text: "text-neutral-500" },
  SPAM: { label: "Spam", bg: "bg-red-100", text: "text-red-500" },
  CONVERTIDO: { label: "Convertido", bg: "bg-green-100", text: "text-green-800" },
  PERDIDO: { label: "Perdido", bg: "bg-red-100", text: "text-red-700" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  BAJA: { label: "Baja", color: "text-neutral-500", bg: "bg-neutral-100" },
  MEDIA: { label: "Media", color: "text-blue-600", bg: "bg-blue-100" },
  ALTA: { label: "Alta", color: "text-orange-500", bg: "bg-orange-100" },
  URGENTE: { label: "Urgente", color: "text-red-600", bg: "bg-red-100" },
};

const APPT_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  SOLICITADA: { label: "Solicitada", bg: "bg-blue-100", text: "text-blue-700" },
  PROPUESTA: { label: "Propuesta", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMADA: { label: "Confirmada", bg: "bg-teal-100", text: "text-teal-700" },
  AGENDADA_EXTERNO: { label: "Agendada", bg: "bg-green-100", text: "text-green-700" },
  CANCELADA: { label: "Cancelada", bg: "bg-red-100", text: "text-red-600" },
  REALIZADA: { label: "Realizada", bg: "bg-green-100", text: "text-green-800" },
  NO_PRESENTADO: { label: "No presentado", bg: "bg-neutral-100", text: "text-neutral-500" },
};

const EVENT_ICON_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  CREADO: { icon: <Plus className="w-3.5 h-3.5" />, color: "text-teal-600", bg: "bg-teal-100" },
  ESTADO_CAMBIADO: { icon: <ArrowRight className="w-3.5 h-3.5" />, color: "text-blue-600", bg: "bg-blue-100" },
  NOTA_AÑADIDA: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-purple-600", bg: "bg-purple-100" },
  ASIGNADO: { icon: <User className="w-3.5 h-3.5" />, color: "text-orange-600", bg: "bg-orange-100" },
  CITA_CREADA: { icon: <Calendar className="w-3.5 h-3.5" />, color: "text-green-600", bg: "bg-green-100" },
  LLAMADA: { icon: <Phone className="w-3.5 h-3.5" />, color: "text-neutral-500", bg: "bg-neutral-100" },
};

function getEventStyle(type: string) {
  return EVENT_ICON_MAP[type] ?? {
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-neutral-500",
    bg: "bg-neutral-100",
  };
}

function ChannelIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "WHATSAPP": return <MessageSquare className={cls} />;
    case "FORM_WEB": return <Globe className={cls} />;
    case "LANDING": return <MonitorSmartphone className={cls} />;
    case "CALLCENTER": return <Phone className={cls} />;
    case "CSV_IMPORT": return <Upload className={cls} />;
    case "WEBHOOK": return <Webhook className={cls} />;
    default: return <Users className={cls} />;
  }
}

function UserAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  if (avatar) return <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  return (
    <div className="w-8 h-8 rounded-full bg-[#0F1F3C] text-white flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-neutral-400 hover:text-teal-600 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl shadow-sm ${className ?? ""}`}>
      <div className="px-4 py-3 border-b border-neutral-100">
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-neutral-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      {children ?? (
        <span className="text-sm text-neutral-700 flex-1">
          {value ?? <span className="text-neutral-300 italic">—</span>}
        </span>
      )}
    </div>
  );
}

// ─── NOTE FORM ────────────────────────────────────────────────────────────────

function NoteForm({ leadId, onSuccess }: { leadId: string; onSuccess: () => void }) {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isPrivate }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error al añadir nota"); return; }
      setContent("");
      setIsPrivate(false);
      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-3 border-t border-neutral-100">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Añadir nota…"
        rows={3}
        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm text-neutral-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-neutral-300 text-teal-600"
          />
          <Lock className="w-3 h-3" />
          Nota privada
        </label>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Añadir
        </button>
      </div>
    </form>
  );
}

// ─── TAG MANAGER ─────────────────────────────────────────────────────────────

function TagManager({ leadId, initialTags }: { leadId: string; initialTags: LeadTag[] }) {
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState("");
  const router = useRouter();

  async function addTag() {
    if (!input.trim()) return;
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName: input.trim() }),
    });
    if (res.ok) { setInput(""); router.refresh(); }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && <span className="text-xs text-neutral-400 italic">Sin etiquetas</span>}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Nueva etiqueta…"
          className="flex-1 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Añadir
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function LeadDetailClient({ lead, users, currentUserId }: LeadDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("timeline");
  const [assigning, setAssigning] = useState(false);
  const [utmOpen, setUtmOpen] = useState(false);

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  const statusInfo = STATUS_MAP[lead.status] ?? { label: lead.status, bg: "bg-neutral-100", text: "text-neutral-600" };
  const priorityInfo = PRIORITY_MAP[lead.priority] ?? { label: lead.priority, color: "text-neutral-500", bg: "bg-neutral-100" };

  const assigneeName = lead.assignedTo
    ? lead.assignedTo.name ?? `${lead.assignedTo.firstName ?? ""} ${lead.assignedTo.lastName ?? ""}`.trim()
    : null;

  const hasUtms = !!(lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmContent || lead.utmTerm);
  const latestAppointment = lead.appointments[0] ?? null;

  async function assignTo(userId: string | null) {
    setAssigning(true);
    try {
      await fetch(`/api/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: userId }),
      });
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-neutral-50">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-neutral-200 px-4 md:px-6 py-4">
        {/* Back button */}
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Leads
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Lead info */}
          <div className="flex items-start gap-4">
            {/* Big avatar */}
            <div className="w-14 h-14 rounded-2xl bg-[#0F1F3C] text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
              {[lead.firstName[0], lead.lastName?.[0]].filter(Boolean).join("").toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                  {statusInfo.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.bg} ${priorityInfo.color}`}>
                  Prioridad {priorityInfo.label}
                </span>
                {lead.channelRef && (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    <ChannelIcon type={lead.channelRef.type} />
                    {lead.channelRef.name}
                  </span>
                )}
                {lead.gdprConsent ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" />
                    RGPD
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    <ShieldOff className="w-3 h-3" />
                    Sin RGPD
                  </span>
                )}
              </div>
              {lead.lastInteractionAt && (
                <p className="text-xs text-neutral-400 mt-1">
                  Última interacción {formatDistanceToNow(new Date(lead.lastInteractionAt), { addSuffix: true, locale: es })}
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Cambiar estado */}
            <StatusChangeModal leadId={lead.id} currentStatus={lead.status}>
              <button className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white text-neutral-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors">
                <ArrowRight className="w-4 h-4" />
                Cambiar estado
              </button>
            </StatusChangeModal>

            {/* Asignar */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  disabled={assigning}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white text-neutral-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                  Asignar
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="z-50 min-w-[200px] bg-white border border-neutral-200 rounded-xl shadow-lg py-1 outline-none max-h-60 overflow-y-auto"
                >
                  {assigneeName && (
                    <DropdownMenu.Item
                      onSelect={() => assignTo(null)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer outline-none"
                    >
                      Sin asignar
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                  {users.map((u) => {
                    const name = (u.name ?? `${(u.firstName ?? "")} ${(u.lastName ?? "")}`.trim()) || u.email;
                    const isCurrent = u.id === lead.assignedToId;
                    return (
                      <DropdownMenu.Item
                        key={u.id}
                        onSelect={() => assignTo(u.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                      >
                        {isCurrent && <Check className="w-4 h-4 text-teal-600 mr-1" />}
                        <div className="w-6 h-6 rounded-full bg-[#0F1F3C] text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate">{name}</span>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Crear cita */}
            <AppointmentModal
              clinics={lead.clinic ? [{ id: lead.clinic.id, name: lead.clinic.name }] : []}
              leads={[{ id: lead.id, firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone }]}
              defaultLeadId={lead.id}
            >
              <button className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white text-neutral-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors">
                <Calendar className="w-4 h-4" />
                Crear cita
              </button>
            </AppointmentModal>

            {/* Llamar */}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                Llamar
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN LAYOUT ── */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 md:p-6 min-h-0">
        {/* ── LEFT COLUMN ── */}
        <div className="flex-[2] flex flex-col gap-4 min-w-0">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
            {/* Tab bar */}
            <Tabs.List className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-1 shadow-sm mb-4">
              {[
                { value: "timeline", label: "Timeline", count: lead._count.events },
                { value: "notas", label: "Notas", count: lead._count.notes },
                { value: "mensajes", label: "Mensajes", count: lead._count.conversations },
              ].map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors data-[state=active]:bg-[#0F1F3C] data-[state=active]:text-white text-neutral-600 hover:text-neutral-900"
                >
                  {tab.label}
                  <span className="text-xs bg-neutral-100 data-[state=active]:bg-white/20 px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* TIMELINE TAB */}
            <Tabs.Content value="timeline" className="flex-1">
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
                {lead.events.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-neutral-400">
                    <Clock className="w-8 h-8 text-neutral-200" />
                    <p className="text-sm">Sin eventos aún</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-100" />
                    <div className="flex flex-col gap-0">
                      {lead.events.map((event, i) => {
                        const style = getEventStyle(event.type);
                        const userName = event.user
                          ? event.user.name ?? `${event.user.firstName ?? ""} ${event.user.lastName ?? ""}`.trim()
                          : null;
                        return (
                          <div key={event.id} className="flex items-start gap-3 pl-1 pb-4 relative">
                            {/* Icon circle */}
                            <div className={`w-8 h-8 rounded-full ${style.bg} ${style.color} flex items-center justify-center flex-shrink-0 z-10 relative`}>
                              {style.icon}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-sm text-neutral-700 leading-snug">{event.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {userName && (
                                  <span className="text-xs text-neutral-500">{userName}</span>
                                )}
                                <span className="text-xs text-neutral-400">
                                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: es })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Tabs.Content>

            {/* NOTAS TAB */}
            <Tabs.Content value="notas" className="flex-1">
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 flex flex-col gap-4">
                {lead.notes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-neutral-400">
                    <MessageSquare className="w-8 h-8 text-neutral-200" />
                    <p className="text-sm">Sin notas aún</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {lead.notes.map((note) => {
                      const author = note.user.name ?? `${note.user.firstName ?? ""} ${note.user.lastName ?? ""}`.trim();
                      return (
                        <div
                          key={note.id}
                          className={`rounded-xl p-3 ${note.isPrivate ? "bg-amber-50 border border-amber-200" : "bg-neutral-50 border border-neutral-100"}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={author} avatar={note.user.avatar} />
                              <span className="text-sm font-medium text-neutral-700">{author}</span>
                              {note.isPrivate && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                  <Lock className="w-2.5 h-2.5" />
                                  Privada
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400">
                              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <NoteForm leadId={lead.id} onSuccess={() => router.refresh()} />
              </div>
            </Tabs.Content>

            {/* MENSAJES TAB */}
            <Tabs.Content value="mensajes" className="flex-1">
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 py-12">
                <MessageSquare className="w-10 h-10 text-neutral-200" />
                <p className="text-sm font-medium text-neutral-500">Módulo de mensajería</p>
                <p className="text-xs text-neutral-400">La integración de WhatsApp y mensajes está disponible a través del módulo de canales.</p>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="md:w-80 flex flex-col gap-4 flex-shrink-0">
          {/* Datos del lead */}
          <SectionCard title="Datos del Lead">
            <div className="flex flex-col divide-y divide-neutral-50">
              <InfoRow label="Nombre completo" value={fullName} />
              <InfoRow label="Teléfono">
                {lead.phone ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-700">{lead.phone}</span>
                    <CopyButton value={lead.phone} />
                  </div>
                ) : <span className="text-neutral-300 italic text-sm">—</span>}
              </InfoRow>
              <InfoRow label="Email">
                {lead.email ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-700 truncate">{lead.email}</span>
                    <CopyButton value={lead.email} />
                  </div>
                ) : <span className="text-neutral-300 italic text-sm">—</span>}
              </InfoRow>
              <InfoRow label="Tratamiento" value={lead.treatment} />
              <InfoRow label="Canal" value={lead.channelRef?.name ?? lead.channel} />
              <InfoRow label="Clínica" value={lead.clinic?.name} />
              <InfoRow label="RGPD">
                {lead.gdprConsent ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700">
                    <Shield className="w-3 h-3" />
                    Consentido
                    {lead.gdprConsentDate && (
                      <span className="text-neutral-400 ml-1">
                        ({format(new Date(lead.gdprConsentDate), "dd/MM/yyyy")})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600">
                    <ShieldOff className="w-3 h-3" />
                    Sin consentimiento
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Creado"
                value={format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm")}
              />
              {lead.firstResponseAt && (
                <InfoRow label="1ª respuesta"
                  value={format(new Date(lead.firstResponseAt), "dd/MM/yyyy HH:mm")}
                />
              )}
              {lead.lastInteractionAt && (
                <InfoRow label="Última inter."
                  value={formatDistanceToNow(new Date(lead.lastInteractionAt), { addSuffix: true, locale: es })}
                />
              )}
            </div>
          </SectionCard>

          {/* Asignación */}
          <SectionCard title="Asignación">
            {assigneeName && lead.assignedTo ? (
              <div className="flex items-center gap-3">
                <UserAvatar name={assigneeName} avatar={lead.assignedTo.avatar} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{assigneeName}</p>
                  <p className="text-xs text-neutral-400">{lead.assignedTo.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 italic mb-3">Sin asignar</p>
            )}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="mt-3 w-full border border-neutral-200 text-neutral-600 text-sm py-1.5 rounded-lg hover:bg-neutral-50 transition-colors">
                  Reasignar
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  className="z-50 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 outline-none max-h-48 overflow-y-auto"
                >
                  <DropdownMenu.Item
                    onSelect={() => assignTo(null)}
                    className="px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer outline-none"
                  >
                    Sin asignar
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                  {users.map((u) => {
                    const name = (u.name ?? `${(u.firstName ?? "")} ${(u.lastName ?? "")}`.trim()) || u.email;
                    return (
                      <DropdownMenu.Item
                        key={u.id}
                        onSelect={() => assignTo(u.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                      >
                        {u.id === lead.assignedToId && <Check className="w-4 h-4 text-teal-600" />}
                        <span className="truncate">{name}</span>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </SectionCard>

          {/* UTMs (collapsible) */}
          {(hasUtms || lead.origin) && (
            <Collapsible.Root open={utmOpen} onOpenChange={setUtmOpen}>
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm">
                <Collapsible.Trigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors rounded-t-xl">
                    <h3 className="text-sm font-semibold text-neutral-700">Origen y UTMs</h3>
                    {utmOpen
                      ? <ChevronDown className="w-4 h-4 text-neutral-400" />
                      : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                  </button>
                </Collapsible.Trigger>
                <Collapsible.Content>
                  <div className="p-4 flex flex-col divide-y divide-neutral-50">
                    {lead.origin && <InfoRow label="Origen" value={lead.origin} />}
                    {lead.channel && <InfoRow label="Canal raw" value={lead.channel} />}
                    {lead.utmSource && <InfoRow label="utm_source" value={lead.utmSource} />}
                    {lead.utmMedium && <InfoRow label="utm_medium" value={lead.utmMedium} />}
                    {lead.utmCampaign && <InfoRow label="utm_campaign" value={lead.utmCampaign} />}
                    {lead.utmContent && <InfoRow label="utm_content" value={lead.utmContent} />}
                    {lead.utmTerm && <InfoRow label="utm_term" value={lead.utmTerm} />}
                    {lead.campaign && <InfoRow label="Campaña" value={lead.campaign.name} />}
                  </div>
                </Collapsible.Content>
              </div>
            </Collapsible.Root>
          )}

          {/* Cita vinculada */}
          <SectionCard title="Cita vinculada">
            {latestAppointment ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  {(() => {
                    const s = APPT_STATUS_MAP[latestAppointment.status] ?? { label: latestAppointment.status, bg: "bg-neutral-100", text: "text-neutral-600" };
                    return (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    );
                  })()}
                  {latestAppointment.proposedAt && (
                    <span className="text-xs text-neutral-500">
                      {format(new Date(latestAppointment.proposedAt), "dd/MM/yyyy HH:mm")}
                    </span>
                  )}
                </div>
                {latestAppointment.treatment && (
                  <p className="text-sm text-neutral-700">{latestAppointment.treatment}</p>
                )}
                {latestAppointment.clinic && (
                  <p className="text-xs text-neutral-500">{latestAppointment.clinic.name}</p>
                )}
                {latestAppointment.notes && (
                  <p className="text-xs text-neutral-500 italic">{latestAppointment.notes}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-3">
                <p className="text-sm text-neutral-400 italic">Sin cita creada</p>
                <AppointmentModal
                  clinics={lead.clinic ? [{ id: lead.clinic.id, name: lead.clinic.name }] : []}
                  leads={[{ id: lead.id, firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone }]}
                  defaultLeadId={lead.id}
                >
                  <button className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
                    <Calendar className="w-4 h-4" />
                    Crear cita
                  </button>
                </AppointmentModal>
              </div>
            )}
          </SectionCard>

          {/* Etiquetas */}
          <SectionCard title="Etiquetas">
            <TagManager leadId={lead.id} initialTags={lead.tags} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
