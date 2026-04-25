"use client";

import {
  MessageSquare,
  Globe,
  Webhook,
  UserPlus,
  FileSpreadsheet,
  Link2,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ChannelCardProps {
  type: string;
  name: string;
  description: string;
  status?: string;
  leadsCount?: number;
  onConfigure?: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  WHATSAPP: { icon: MessageSquare, color: "text-green-600", bg: "bg-green-50 border-green-100" },
  FORM_WEB: { icon: Globe, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  WEBHOOK: { icon: Webhook, color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
  MANUAL: { icon: UserPlus, color: "text-neutral-600", bg: "bg-neutral-50 border-neutral-200" },
  CSV_IMPORT: { icon: FileSpreadsheet, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
  GENERIC: { icon: Link2, color: "text-teal-600", bg: "bg-teal-50 border-teal-100" },
  LANDING: { icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
  CALLCENTER: { icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
};

function StatusIndicator({ status }: { status?: string }) {
  switch (status) {
    case "ACTIVO":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Activo
        </span>
      );
    case "PENDIENTE_CONFIG":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
          <Clock className="w-3.5 h-3.5" />
          Pendiente configuración
        </span>
      );
    case "ERROR":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
          <XCircle className="w-3.5 h-3.5" />
          Error
        </span>
      );
    case "INACTIVO":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Inactivo
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400">
          <Clock className="w-3.5 h-3.5" />
          Sin configurar
        </span>
      );
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function ChannelCard({ type, name, description, status, leadsCount, onConfigure }: ChannelCardProps) {
  const config = CHANNEL_CONFIG[type] ?? CHANNEL_CONFIG.GENERIC;
  const Icon = config.icon;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 text-sm">{name}</p>
            <StatusIndicator status={status} />
          </div>
        </div>
        {leadsCount !== undefined && (
          <span className="text-xs font-semibold text-neutral-500 flex-shrink-0">
            {leadsCount} leads
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>

      {/* Connection status dot */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              status === "ACTIVO" ? "bg-green-400" : status === "ERROR" ? "bg-red-400" : "bg-neutral-300"
            }`}
          />
          <span className="text-xs text-neutral-400">
            {status === "ACTIVO" ? "Conectado" : status === "ERROR" ? "Con errores" : "Desconectado"}
          </span>
        </div>
        <button
          onClick={onConfigure}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar
        </button>
      </div>
    </div>
  );
}
