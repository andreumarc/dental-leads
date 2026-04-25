"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Phone,
  Mail,
  MessageSquare,
  Globe,
  MonitorSmartphone,
  Users,
  Upload,
  Webhook,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LeadCardLead {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  status: string;
  priority: string;
  createdAt: Date | string;
  lastInteractionAt: Date | string | null;
  channel: { type: string; name: string } | null;
  clinic: { id: string; name: string } | null;
  assignedTo: { id: string; name: string | null; firstName: string | null; lastName: string | null; avatar: string | null } | null;
  tags: { id: string; name: string; color: string }[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  NUEVO: { label: "Nuevo", bg: "bg-blue-100", text: "text-blue-700" },
  SIN_ASIGNAR: { label: "Sin asignar", bg: "bg-neutral-100", text: "text-neutral-600" },
  ASIGNADO: { label: "Asignado", bg: "bg-indigo-100", text: "text-indigo-700" },
  PENDIENTE_RESPUESTA: { label: "Pendiente", bg: "bg-yellow-100", text: "text-yellow-700" },
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

const PRIORITY_COLOR: Record<string, string> = {
  BAJA: "bg-neutral-300",
  MEDIA: "bg-blue-400",
  ALTA: "bg-orange-400",
  URGENTE: "bg-red-500",
};

function ChannelIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5";
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

function Avatar({ name, avatar, size = "sm" }: { name: string; avatar?: string | null; size?: "sm" | "xs" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClass = size === "xs" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs";

  if (avatar) {
    return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover`} />;
  }

  return (
    <div className={`${sizeClass} rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold`}>
      {initials}
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function LeadCard({ lead }: { lead: LeadCardLead }) {
  const statusInfo = STATUS_MAP[lead.status] ?? { label: lead.status, bg: "bg-neutral-100", text: "text-neutral-600" };
  const priorityColor = PRIORITY_COLOR[lead.priority] ?? "bg-neutral-300";
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  const assigneeName = lead.assignedTo
    ? lead.assignedTo.name ?? `${lead.assignedTo.firstName ?? ""} ${lead.assignedTo.lastName ?? ""}`.trim()
    : null;

  const createdAt = new Date(lead.createdAt);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: es });

  return (
    <Link href={`/leads/${lead.id}`} className="block">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-150 overflow-hidden">
        {/* Priority left border */}
        <div className={`h-1 w-full ${priorityColor}`} />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-[#0F1F3C] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {[lead.firstName[0], lead.lastName?.[0]].filter(Boolean).join("").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 text-sm truncate">{fullName}</p>
                {lead.phone && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Middle row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-3">
            {lead.treatment && (
              <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md font-medium">
                {lead.treatment}
              </span>
            )}
            {lead.channel && (
              <span className="flex items-center gap-1 text-neutral-500">
                <ChannelIcon type={lead.channel.type} />
                {lead.channel.name}
              </span>
            )}
            {lead.clinic && (
              <span className="text-neutral-400">• {lead.clinic.name}</span>
            )}
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {assigneeName ? (
                <>
                  <Avatar name={assigneeName} avatar={lead.assignedTo?.avatar} size="xs" />
                  <span className="text-xs text-neutral-500">{assigneeName}</span>
                </>
              ) : (
                <span className="text-xs text-neutral-400 italic">Sin asignar</span>
              )}
            </div>
            <span className="text-xs text-neutral-400">{timeAgo}</span>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-neutral-100">
              {lead.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {lead.tags.length > 3 && (
                <span className="text-xs text-neutral-400">+{lead.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
