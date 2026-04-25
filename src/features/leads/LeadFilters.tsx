"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, Check } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Clinic { id: string; name: string }
interface Channel { id: string; name: string; type: string }
interface User { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string }

interface LeadFiltersProps {
  clinics: Clinic[];
  channels: Channel[];
  users: User[];
  activeStatuses: string[];
  activePriorities: string[];
  activeChannelIds: string[];
  activeClinicIds: string[];
  activeAssignedIds: string[];
  dateFrom?: string;
  dateTo?: string;
  onClose?: () => void;
}

const LEAD_STATUSES: { value: string; label: string }[] = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "SIN_ASIGNAR", label: "Sin asignar" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "PENDIENTE_RESPUESTA", label: "Pendiente respuesta" },
  { value: "RESPONDIDO", label: "Respondido" },
  { value: "PENDIENTE_LLAMADA", label: "Pendiente llamada" },
  { value: "EN_SEGUIMIENTO", label: "En seguimiento" },
  { value: "CITA_SOLICITADA", label: "Cita solicitada" },
  { value: "CITA_PROPUESTA", label: "Cita propuesta" },
  { value: "CITA_CONFIRMADA", label: "Cita confirmada" },
  { value: "NO_LOCALIZADO", label: "No localizado" },
  { value: "NO_INTERESADO", label: "No interesado" },
  { value: "DUPLICADO", label: "Duplicado" },
  { value: "SPAM", label: "Spam" },
  { value: "CONVERTIDO", label: "Convertido" },
  { value: "PERDIDO", label: "Perdido" },
];

const PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: "BAJA", label: "Baja", color: "text-neutral-500" },
  { value: "MEDIA", label: "Media", color: "text-blue-600" },
  { value: "ALTA", label: "Alta", color: "text-orange-500" },
  { value: "URGENTE", label: "Urgente", color: "text-red-600" },
];

// ─── MULTICHECK OPTION ────────────────────────────────────────────────────────

function MultiCheckItem({
  label,
  checked,
  onToggle,
  className,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-neutral-50 text-sm text-neutral-700 text-left"
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
          checked ? "bg-teal-600 border-teal-600" : "border-neutral-300"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      <span className={className}>{label}</span>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function LeadFilters({
  clinics,
  channels,
  users,
  activeStatuses,
  activePriorities,
  activeChannelIds,
  activeClinicIds,
  activeAssignedIds,
  dateFrom: initialDateFrom,
  dateTo: initialDateTo,
  onClose,
}: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [statuses, setStatuses] = useState<string[]>(activeStatuses);
  const [priorities, setPriorities] = useState<string[]>(activePriorities);
  const [channelIds, setChannelIds] = useState<string[]>(activeChannelIds);
  const [clinicIds, setClinicIds] = useState<string[]>(activeClinicIds);
  const [assignedIds, setAssignedIds] = useState<string[]>(activeAssignedIds);
  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialDateTo ?? "");

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("status");
    params.delete("priority");
    params.delete("channelId");
    params.delete("clinicId");
    params.delete("assignedToId");
    params.delete("dateFrom");
    params.delete("dateTo");
    params.delete("page");

    statuses.forEach((s) => params.append("status", s));
    priorities.forEach((p) => params.append("priority", p));
    channelIds.forEach((c) => params.append("channelId", c));
    clinicIds.forEach((c) => params.append("clinicId", c));
    assignedIds.forEach((a) => params.append("assignedToId", a));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    router.push(`${pathname}?${params.toString()}`);
    onClose?.();
  }

  function clearFilters() {
    setStatuses([]);
    setPriorities([]);
    setChannelIds([]);
    setClinicIds([]);
    setAssignedIds([]);
    setDateFrom("");
    setDateTo("");
  }

  const activeCount =
    statuses.length +
    priorities.length +
    channelIds.length +
    clinicIds.length +
    assignedIds.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900 text-sm">Filtros</span>
          {activeCount > 0 && (
            <span className="bg-teal-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
              {activeCount}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0 overflow-y-auto max-h-[70vh] p-4 gap-5">
        {/* Status */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Estado</p>
          <div className="grid grid-cols-1 gap-0.5 max-h-48 overflow-y-auto">
            {LEAD_STATUSES.map((s) => (
              <MultiCheckItem
                key={s.value}
                label={s.label}
                checked={statuses.includes(s.value)}
                onToggle={() => toggle(statuses, setStatuses, s.value)}
              />
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Prioridad</p>
          <div className="flex flex-col gap-0.5">
            {PRIORITIES.map((p) => (
              <MultiCheckItem
                key={p.value}
                label={p.label}
                checked={priorities.includes(p.value)}
                onToggle={() => toggle(priorities, setPriorities, p.value)}
                className={p.color}
              />
            ))}
          </div>
        </div>

        {/* Channel */}
        {channels.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Canal</p>
            <div className="flex flex-col gap-0.5">
              {channels.map((c) => (
                <MultiCheckItem
                  key={c.id}
                  label={c.name}
                  checked={channelIds.includes(c.id)}
                  onToggle={() => toggle(channelIds, setChannelIds, c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Clinic */}
        {clinics.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Clínica</p>
            <div className="flex flex-col gap-0.5">
              {clinics.map((c) => (
                <MultiCheckItem
                  key={c.id}
                  label={c.name}
                  checked={clinicIds.includes(c.id)}
                  onToggle={() => toggle(clinicIds, setClinicIds, c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Assigned to */}
        {users.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Asignado a</p>
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {users.map((u) => (
                <MultiCheckItem
                  key={u.id}
                  label={u.name ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                  checked={assignedIds.includes(u.id)}
                  onToggle={() => toggle(assignedIds, setAssignedIds, u.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Date range */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Fecha creación</p>
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-200 bg-neutral-50">
        <button
          onClick={clearFilters}
          className="flex-1 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg py-2 hover:bg-white transition-colors"
        >
          Limpiar
        </button>
        <button
          onClick={applyFilters}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg py-2 font-medium transition-colors"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}

// ─── FILTER POPOVER WRAPPER ───────────────────────────────────────────────────

interface FilterPopoverProps {
  label: string;
  children: React.ReactNode;
  activeCount?: number;
}

export function FilterPopover({ label, children, activeCount }: FilterPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            activeCount
              ? "border-teal-600 bg-teal-50 text-teal-700"
              : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          {label}
          {activeCount ? (
            <span className="bg-teal-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-semibold">
              {activeCount}
            </span>
          ) : null}
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg p-0 outline-none"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
