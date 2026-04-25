"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { AppointmentModal } from "./AppointmentModal";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface AppointmentRow {
  id: string;
  treatment: string | null;
  specialty: string | null;
  status: string;
  proposedAt: Date | string | null;
  confirmedAt: Date | string | null;
  scheduledAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  lead: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    treatment: string | null;
    status: string;
  };
  clinic: { id: string; name: string; city: string | null } | null;
  user: { id: string; name: string | null; email: string } | null;
}

interface Clinic { id: string; name: string }
interface Lead { id: string; firstName: string; lastName: string | null; phone: string | null }

interface CurrentFilters {
  statuses: string[];
  clinicIds: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface AppointmentsClientProps {
  appointments: AppointmentRow[];
  total: number;
  page: number;
  pageSize: number;
  clinics: Clinic[];
  leads: Lead[];
  currentFilters: CurrentFilters;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const APPT_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  SOLICITADA: { label: "Solicitada", bg: "bg-blue-100", text: "text-blue-700" },
  PROPUESTA: { label: "Propuesta", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMADA: { label: "Confirmada", bg: "bg-teal-100", text: "text-teal-700" },
  AGENDADA_EXTERNO: { label: "Agendada", bg: "bg-green-100", text: "text-green-700" },
  CANCELADA: { label: "Cancelada", bg: "bg-red-100", text: "text-red-600" },
  REALIZADA: { label: "Realizada", bg: "bg-green-100", text: "text-green-800" },
  NO_PRESENTADO: { label: "No presentado", bg: "bg-neutral-100", text: "text-neutral-500" },
};

const QUICK_STATUS_TABS = [
  { label: "Todas", value: undefined },
  { label: "Solicitadas", value: "SOLICITADA" },
  { label: "Propuestas", value: "PROPUESTA" },
  { label: "Confirmadas", value: "CONFIRMADA" },
  { label: "Agendadas", value: "AGENDADA_EXTERNO" },
  { label: "Realizadas", value: "REALIZADA" },
  { label: "Canceladas", value: "CANCELADA" },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function AppointmentsClient({
  appointments,
  total,
  page,
  pageSize,
  clinics,
  leads,
  currentFilters,
}: AppointmentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");

  const totalPages = Math.ceil(total / pageSize);

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  function setQuickStatus(status?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("page");
    if (status) params.append("status", status);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function cancelAppointment(id: string) {
    if (!confirm("¿Cancelar esta cita?")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const currentStatusFilter = currentFilters.statuses[0] ?? undefined;

  return (
    <div className="flex flex-col min-h-full bg-neutral-50">
      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-neutral-200 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900">Citas</h1>
            <span className="bg-[#0F1F3C] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {total.toLocaleString("es-ES")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-white shadow-sm text-neutral-800" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`p-1.5 rounded-md transition-colors ${view === "calendar" ? "bg-white shadow-sm text-neutral-800" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            <AppointmentModal clinics={clinics} leads={leads} />
          </div>
        </div>

        {/* Quick tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {QUICK_STATUS_TABS.map((tab) => {
            const isActive = tab.value === currentStatusFilter;
            return (
              <button
                key={tab.label}
                onClick={() => setQuickStatus(tab.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#0F1F3C] text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-4 md:p-6">
        {view === "calendar" ? (
          /* Calendar placeholder */
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-8 flex flex-col items-center gap-3">
            <Calendar className="w-12 h-12 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-500">Vista de calendario</p>
            <p className="text-xs text-neutral-400 text-center max-w-xs">
              La vista de calendario está disponible con integración de Google Calendar o mediante el módulo de agenda avanzada.
            </p>
            <button
              onClick={() => setView("list")}
              className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Volver a lista
            </button>
          </div>
        ) : (
          /* List view */
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <Calendar className="w-10 h-10 text-neutral-200" />
                <p className="text-sm font-medium text-neutral-500">Sin citas</p>
                <p className="text-xs text-neutral-400">Crea una nueva cita o cambia los filtros</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse">
                    <thead className="border-b border-neutral-200 bg-neutral-50">
                      <tr>
                        {["Lead", "Clínica", "Tratamiento", "Fecha propuesta", "Estado", "Notas", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appt) => {
                        const leadName = [appt.lead.firstName, appt.lead.lastName].filter(Boolean).join(" ");
                        const statusInfo = APPT_STATUS_MAP[appt.status] ?? { label: appt.status, bg: "bg-neutral-100", text: "text-neutral-600" };

                        return (
                          <tr
                            key={appt.id}
                            className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                          >
                            {/* Lead */}
                            <td className="px-4 py-3">
                              <Link href={`/leads/${appt.lead.id}`} className="hover:text-teal-600 transition-colors">
                                <p className="text-sm font-medium text-neutral-900">{leadName}</p>
                                {appt.lead.phone && (
                                  <p className="text-xs text-neutral-500">{appt.lead.phone}</p>
                                )}
                              </Link>
                            </td>

                            {/* Clinic */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-neutral-600">
                                {appt.clinic?.name ?? <span className="text-neutral-300">—</span>}
                              </span>
                            </td>

                            {/* Treatment */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-neutral-600">
                                {appt.treatment ?? <span className="text-neutral-300">—</span>}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3">
                              {appt.proposedAt ? (
                                <div>
                                  <p className="text-sm text-neutral-700">
                                    {format(new Date(appt.proposedAt), "dd/MM/yyyy HH:mm")}
                                  </p>
                                  <p className="text-xs text-neutral-400">
                                    {formatDistanceToNow(new Date(appt.proposedAt), { addSuffix: true, locale: es })}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-neutral-300 text-sm">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                                {statusInfo.label}
                              </span>
                            </td>

                            {/* Notes */}
                            <td className="px-4 py-3 max-w-[160px]">
                              {appt.notes ? (
                                <p className="text-xs text-neutral-500 truncate" title={appt.notes}>
                                  {appt.notes}
                                </p>
                              ) : (
                                <span className="text-neutral-300 text-xs">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                  <DropdownMenu.Content
                                    align="end"
                                    className="z-50 min-w-[150px] bg-white border border-neutral-200 rounded-xl shadow-lg py-1 outline-none"
                                  >
                                    <DropdownMenu.Item asChild>
                                      <Link
                                        href={`/leads/${appt.lead.id}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                                      >
                                        Ver lead
                                      </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                                    <DropdownMenu.Item
                                      onSelect={() => cancelAppointment(appt.id)}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Cancelar cita
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200">
                    <p className="text-sm text-neutral-500">
                      Mostrando{" "}
                      <span className="font-medium text-neutral-700">
                        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}
                      </span>{" "}
                      de <span className="font-medium text-neutral-700">{total.toLocaleString("es-ES")}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                            p === page
                              ? "bg-teal-600 border-teal-600 text-white font-medium"
                              : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
