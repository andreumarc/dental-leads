"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  UserPlus,
  CheckCircle2,
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { DashboardStats } from "@/types";
import type { LeadStatus } from "@prisma/client";
import { StatCard } from "@/components/ui/stat-card";
import { LeadStatusBadge } from "@/components/ui/badge";
import { cn, formatRelativeDate, formatPhone } from "@/lib/utils";

// Types for the recent leads from the server
interface RecentLead {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  status: LeadStatus;
  priority: string;
  createdAt: Date;
  lastInteractionAt: Date | null;
  clinic: { id: string; name: string; slug: string; city: string | null } | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
}

interface DashboardClientProps {
  stats: DashboardStats;
  recentLeads: RecentLead[];
}

// ─── Color palette for charts ─────────────────────────────────────────────────

const CHART_COLORS = {
  primary: "#0D9488",   // teal
  secondary: "#0F1F3C", // navy
  accent1: "#14b8a6",
  accent2: "#2dd4bf",
  accent3: "#5eead4",
  muted: "#d4d4d4",
};

const PIE_COLORS = [
  "#0D9488",
  "#0F1F3C",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#84cc16",
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomBarTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-neutral-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-neutral-600">
          {entry.name}:{" "}
          <span className="font-semibold text-neutral-900">
            {new Intl.NumberFormat("es-ES").format(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { percentage: number } }[];
}) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-neutral-700">{entry.name}</p>
      <p className="text-neutral-600">
        <span className="font-semibold text-neutral-900">{entry.value}</span>{" "}
        leads
        {entry.payload.percentage > 0 && (
          <span className="text-neutral-400 ml-1">
            ({entry.payload.percentage}%)
          </span>
        )}
      </p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({ stats, recentLeads }: DashboardClientProps) {
  const {
    totalLeads,
    newLeads,
    convertedLeads,
    appointmentsConfirmed,
    pendingLeads,
    leadsGrowthPercent,
    conversionRate,
    leadsPerChannel,
    leadsPerStatus,
    topTreatments,
    leadsTrend,
  } = stats;

  // Prepare chart data
  const channelChartData = leadsPerChannel
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => ({
      name: c.channel.length > 12 ? c.channel.slice(0, 12) + "…" : c.channel,
      fullName: c.channel,
      Leads: c.count,
    }));

  const statusChartData = leadsPerStatus
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((s) => ({
      name: statusLabel(s.status),
      value: s.count,
      percentage: s.percentage,
    }));

  const treatmentChartData = topTreatments
    .filter((t) => t.treatment && t.count > 0)
    .slice(0, 8)
    .map((t) => ({
      name:
        t.treatment.length > 18 ? t.treatment.slice(0, 18) + "…" : t.treatment,
      Leads: t.count,
    }));

  const trendChartData = leadsTrend.slice(-30).map((d) => ({
    date: d.date.slice(5), // MM-DD
    Leads: d.count,
    Convertidos: d.converted,
  }));

  // KPI growth trend
  const growthTrend: "up" | "down" | "neutral" =
    leadsGrowthPercent > 0
      ? "up"
      : leadsGrowthPercent < 0
        ? "down"
        : "neutral";

  return (
    <div className="space-y-6 pb-8">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Leads"
          value={totalLeads}
          icon={Users}
          iconColor="text-[#0F1F3C]"
          iconBg="bg-blue-50"
          change={
            leadsGrowthPercent !== 0
              ? {
                  value: leadsGrowthPercent,
                  label: "vs mes anterior",
                }
              : undefined
          }
          trend={growthTrend}
        />
        <StatCard
          title="Nuevos Hoy"
          value={newLeads}
          icon={UserPlus}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          description="leads captados hoy"
        />
        <StatCard
          title="Convertidos"
          value={convertedLeads}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          change={
            conversionRate > 0
              ? { value: conversionRate, label: "tasa conversión" }
              : undefined
          }
          trend={conversionRate >= 10 ? "up" : "neutral"}
        />
        <StatCard
          title="Citas Confirmadas"
          value={appointmentsConfirmed}
          icon={Calendar}
          iconColor="text-[#0D9488]"
          iconBg="bg-teal-50"
          description="citas activas"
        />
        <StatCard
          title="Pend. Respuesta"
          value={pendingLeads}
          icon={AlertCircle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          trend={pendingLeads > 20 ? "down" : "neutral"}
          description="requieren acción"
        />
        <StatCard
          title="Tasa Conversión"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          trend={conversionRate >= 10 ? "up" : conversionRate < 5 ? "down" : "neutral"}
          description="leads → pacientes"
        />
      </div>

      {/* ── Charts row 1: Channel + Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by channel */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Leads por Canal
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Distribución por fuente de captación
              </p>
            </div>
          </div>
          {channelChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 text-sm">
              Sin datos de canales
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={channelChartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="Leads"
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leads by status — Pie */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Leads por Estado
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Distribución actual del pipeline
              </p>
            </div>
          </div>
          {statusChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 text-sm">
              Sin datos de estados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-neutral-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Charts row 2: Treatments + Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top treatments — horizontal bar */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Tratamientos más Solicitados
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Top 8 tratamientos por número de leads
            </p>
          </div>
          {treatmentChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 text-sm">
              Sin datos de tratamientos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={treatmentChartData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f5f5f5"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="Leads"
                  fill={CHART_COLORS.secondary}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leads trend — last 30 days */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Evolución Últimos 30 Días
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Leads captados y convertidos por día
            </p>
          </div>
          {trendChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 text-sm">
              Sin datos de tendencia
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={trendChartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="Leads"
                  fill={CHART_COLORS.primary}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Convertidos"
                  fill={CHART_COLORS.secondary}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Leads Table ── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Últimos Leads
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Los 10 leads más recientes
            </p>
          </div>
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-1.5 text-xs text-[#0D9488] font-medium hover:text-teal-700 transition-colors"
          >
            Ver todos
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
            <Users className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm font-medium">No hay leads todavía</p>
            <p className="text-xs mt-1">
              Los nuevos leads aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Tratamiento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                    Clínica
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                    Asignado a
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentLeads.map((lead, idx) => {
                  const fullName = [lead.firstName, lead.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const initials = [lead.firstName?.[0], lead.lastName?.[0]]
                    .filter(Boolean)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        "hover:bg-neutral-50 transition-colors duration-100",
                        idx % 2 !== 0 ? "bg-neutral-50/30" : "bg-white"
                      )}
                    >
                      {/* Patient */}
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#0F1F3C] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 truncate group-hover:text-[#0D9488] transition-colors">
                              {fullName || "Sin nombre"}
                            </p>
                            {lead.phone && (
                              <p className="text-xs text-neutral-400 truncate">
                                {formatPhone(lead.phone)}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Treatment */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-600">
                          {lead.treatment ?? (
                            <span className="text-neutral-300">—</span>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>

                      {/* Clinic */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-neutral-500 truncate max-w-[100px] block">
                          {lead.clinic?.name ?? (
                            <span className="text-neutral-300">—</span>
                          )}
                        </span>
                      </td>

                      {/* Assigned to */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[9px] font-semibold text-neutral-600 flex-shrink-0">
                              {lead.assignedTo.name
                                ? lead.assignedTo.name
                                    .split(" ")
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()
                                : "?"}
                            </div>
                            <span className="text-xs text-neutral-500 truncate max-w-[80px]">
                              {lead.assignedTo.name?.split(" ")[0] ??
                                lead.assignedTo.email.split("@")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-300">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-400 whitespace-nowrap">
                          {formatRelativeDate(lead.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status label helper ──────────────────────────────────────────────────────

function statusLabel(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    NUEVO: "Nuevo",
    SIN_ASIGNAR: "Sin asignar",
    ASIGNADO: "Asignado",
    PENDIENTE_RESPUESTA: "Pend. respuesta",
    RESPONDIDO: "Respondido",
    PENDIENTE_LLAMADA: "Pend. llamada",
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
  return map[status] ?? status;
}
