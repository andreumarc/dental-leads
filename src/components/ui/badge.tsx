import { cn } from "@/lib/utils";
import type { LeadStatus, LeadPriority, ChannelType, UserRole } from "@prisma/client";

// ─── Base badge ───────────────────────────────────────────────────────────────

interface BaseBadgeProps {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ className, children }: BaseBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Lead Status Badge ────────────────────────────────────────────────────────

const statusConfig: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  NUEVO: { label: "Nuevo", className: "bg-blue-100 text-blue-700" },
  SIN_ASIGNAR: { label: "Sin asignar", className: "bg-gray-100 text-gray-600" },
  ASIGNADO: { label: "Asignado", className: "bg-teal-100 text-teal-700" },
  PENDIENTE_RESPUESTA: {
    label: "Pendiente resp.",
    className: "bg-yellow-100 text-yellow-700",
  },
  RESPONDIDO: { label: "Respondido", className: "bg-green-100 text-green-700" },
  PENDIENTE_LLAMADA: {
    label: "Pend. llamada",
    className: "bg-orange-100 text-orange-700",
  },
  EN_SEGUIMIENTO: {
    label: "En seguimiento",
    className: "bg-purple-100 text-purple-700",
  },
  CITA_SOLICITADA: {
    label: "Cita solicitada",
    className: "bg-indigo-100 text-indigo-700",
  },
  CITA_PROPUESTA: {
    label: "Cita propuesta",
    className: "bg-violet-100 text-violet-700",
  },
  CITA_CONFIRMADA: {
    label: "Cita confirmada",
    className: "bg-emerald-100 text-emerald-700",
  },
  NO_LOCALIZADO: {
    label: "No localizado",
    className: "bg-gray-100 text-gray-500",
  },
  NO_INTERESADO: {
    label: "No interesado",
    className: "bg-red-100 text-red-600",
  },
  DUPLICADO: { label: "Duplicado", className: "bg-gray-100 text-gray-400" },
  SPAM: { label: "Spam", className: "bg-red-200 text-red-800" },
  CONVERTIDO: {
    label: "Convertido",
    className: "bg-green-200 text-green-800 font-semibold",
  },
  PERDIDO: { label: "Perdido", className: "bg-red-100 text-red-700" },
};

export function LeadStatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <Badge className={cn(config.className, className)}>{config.label}</Badge>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const priorityConfig: Record<
  LeadPriority,
  { label: string; className: string; dot: string }
> = {
  BAJA: {
    label: "Baja",
    className: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
  MEDIA: {
    label: "Media",
    className: "bg-blue-100 text-blue-600",
    dot: "bg-blue-500",
  },
  ALTA: {
    label: "Alta",
    className: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  URGENTE: {
    label: "Urgente",
    className: "bg-red-100 text-red-700",
    dot: "bg-red-600",
  },
};

export function PriorityBadge({
  priority,
  showDot = true,
  className,
}: {
  priority: LeadPriority;
  showDot?: boolean;
  className?: string;
}) {
  const config = priorityConfig[priority] ?? {
    label: priority,
    className: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  };

  return (
    <Badge className={cn(config.className, className)}>
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dot)}
        />
      )}
      {config.label}
    </Badge>
  );
}

// ─── Channel Badge ────────────────────────────────────────────────────────────

const channelConfig: Record<
  ChannelType,
  { label: string; className: string }
> = {
  WHATSAPP: { label: "WhatsApp", className: "bg-green-100 text-green-700" },
  FORM_WEB: { label: "Web", className: "bg-blue-100 text-blue-700" },
  LANDING: { label: "Landing", className: "bg-violet-100 text-violet-700" },
  MANUAL: { label: "Manual", className: "bg-gray-100 text-gray-600" },
  CALLCENTER: {
    label: "Call Center",
    className: "bg-orange-100 text-orange-700",
  },
  CSV_IMPORT: {
    label: "CSV Import",
    className: "bg-yellow-100 text-yellow-700",
  },
  WEBHOOK: { label: "Webhook", className: "bg-pink-100 text-pink-700" },
  GENERIC: { label: "Otro", className: "bg-neutral-100 text-neutral-600" },
};

export function ChannelBadge({
  channelType,
  className,
}: {
  channelType: ChannelType;
  className?: string;
}) {
  const config = channelConfig[channelType] ?? {
    label: channelType,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <Badge className={cn(config.className, className)}>{config.label}</Badge>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  SUPERADMIN: {
    label: "Super Admin",
    className: "bg-purple-100 text-purple-800",
  },
  ADMIN: {
    label: "Administrador",
    className: "bg-blue-100 text-blue-800",
  },
  DEMO: { label: "Demo", className: "bg-gray-100 text-gray-600" },
  DIRECCION: {
    label: "Dirección",
    className: "bg-indigo-100 text-indigo-800",
  },
  RECEPCION: { label: "Recepción", className: "bg-green-100 text-green-800" },
  CALLCENTER: {
    label: "Call Center",
    className: "bg-cyan-100 text-cyan-800",
  },
  
  
};

export function RoleBadge({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const config = roleConfig[role] ?? {
    label: role,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <Badge className={cn(config.className, className)}>{config.label}</Badge>
  );
}
