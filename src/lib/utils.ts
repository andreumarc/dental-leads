import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import type { LeadStatus, LeadPriority } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/** Cast any value to Prisma's InputJsonValue for Json fields */
export function toJson(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue;
}

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function formatDate(
  date: Date | string | null | undefined,
  pattern = "dd/MM/yyyy"
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return format(d, pattern, { locale: es });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  if (isToday(d)) {
    return `Hoy, ${format(d, "HH:mm")}`;
  }

  if (isYesterday(d)) {
    return `Ayer, ${format(d, "HH:mm")}`;
  }

  const distance = formatDistanceToNow(d, { addSuffix: true, locale: es });

  // If within the last 7 days, show relative
  const diffMs = Date.now() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 7) {
    return distance;
  }

  return format(d, "dd MMM yyyy", { locale: es });
}

// Phone formatting
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");

  // Spanish phone format
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  }

  // International format
  if (cleaned.length === 11 && cleaned.startsWith("34")) {
    const local = cleaned.slice(2);
    return `+34 ${local.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}`;
  }

  return phone;
}

// Initials from name
export function getInitials(
  name: string | null | undefined,
  lastName?: string | null
): string {
  if (!name) return "?";

  if (lastName) {
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
}

// Lead status color — returns Tailwind CSS classes
export function getStatusColor(status: LeadStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const map: Record<
    LeadStatus,
    { bg: string; text: string; border: string; dot: string }
  > = {
    NUEVO: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
    },
    SIN_ASIGNAR: {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-200",
      dot: "bg-gray-400",
    },
    ASIGNADO: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      dot: "bg-indigo-500",
    },
    PENDIENTE_RESPUESTA: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
    RESPONDIDO: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-200",
      dot: "bg-cyan-500",
    },
    PENDIENTE_LLAMADA: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      dot: "bg-orange-500",
    },
    EN_SEGUIMIENTO: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      dot: "bg-violet-500",
    },
    CITA_SOLICITADA: {
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
      dot: "bg-sky-500",
    },
    CITA_PROPUESTA: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-400",
    },
    CITA_CONFIRMADA: {
      bg: "bg-teal-50",
      text: "text-teal-700",
      border: "border-teal-200",
      dot: "bg-teal-500",
    },
    NO_LOCALIZADO: {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      dot: "bg-red-400",
    },
    NO_INTERESADO: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
    },
    DUPLICADO: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
      dot: "bg-yellow-400",
    },
    SPAM: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-600",
    },
    CONVERTIDO: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      dot: "bg-green-500",
    },
    PERDIDO: {
      bg: "bg-zinc-50",
      text: "text-zinc-600",
      border: "border-zinc-200",
      dot: "bg-zinc-400",
    },
  };

  return map[status] ?? {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    dot: "bg-gray-400",
  };
}

// Lead priority color — returns Tailwind CSS classes
export function getPriorityColor(priority: LeadPriority): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  const map: Record<
    LeadPriority,
    { bg: string; text: string; border: string; icon: string }
  > = {
    BAJA: {
      bg: "bg-slate-50",
      text: "text-slate-500",
      border: "border-slate-200",
      icon: "text-slate-400",
    },
    MEDIA: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      icon: "text-blue-500",
    },
    ALTA: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      icon: "text-orange-500",
    },
    URGENTE: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: "text-red-600",
    },
  };

  return map[priority] ?? {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    icon: "text-gray-400",
  };
}

// Truncate text
export function truncate(text: string | null | undefined, maxLength = 100): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trimEnd()}…`;
}

// Slugify
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Status label in Spanish
export function getStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    NUEVO: "Nuevo",
    SIN_ASIGNAR: "Sin asignar",
    ASIGNADO: "Asignado",
    PENDIENTE_RESPUESTA: "Pendiente respuesta",
    RESPONDIDO: "Respondido",
    PENDIENTE_LLAMADA: "Pendiente llamada",
    EN_SEGUIMIENTO: "En seguimiento",
    CITA_SOLICITADA: "Cita solicitada",
    CITA_PROPUESTA: "Cita propuesta",
    CITA_CONFIRMADA: "Cita confirmada",
    NO_LOCALIZADO: "No localizado",
    NO_INTERESADO: "No interesado",
    DUPLICADO: "Duplicado",
    SPAM: "Spam",
    CONVERTIDO: "Convertido",
    PERDIDO: "Perdido",
  };
  return labels[status] ?? status;
}

// Priority label in Spanish
export function getPriorityLabel(priority: LeadPriority): string {
  const labels: Record<LeadPriority, string> = {
    BAJA: "Baja",
    MEDIA: "Media",
    ALTA: "Alta",
    URGENTE: "Urgente",
  };
  return labels[priority] ?? priority;
}

// Format currency
export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale = "es-ES"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Calculate percentage change
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
