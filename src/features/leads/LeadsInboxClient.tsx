"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  MonitorSmartphone,
  Webhook,
  Users,
  Check,
  Trash2,
  UserCheck,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { NewLeadModal } from "./NewLeadModal";
import { LeadCard } from "./LeadCard";
import { LeadFilters } from "./LeadFilters";
import { StatusChangeModal } from "./StatusChangeModal";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LeadRow {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  status: string;
  priority: string;
  gdprConsent: boolean;
  isConverted: boolean;
  isDuplicate: boolean;
  lastInteractionAt: Date | string | null;
  createdAt: Date | string;
  companyId: string;
  clinicId: string | null;
  assignedToId: string | null;
  channelId: string | null;
  channel: { type: string; name: string } | null;
  clinic: { id: string; name: string; slug: string; city: string | null } | null;
  assignedTo: { id: string; name: string | null; email: string; firstName: string | null; lastName: string | null; avatar: string | null } | null;
  tags: { id: string; name: string; color: string }[];
  _count: { appointments: number; notes: number; events: number };
}

interface Clinic { id: string; name: string }
interface Channel { id: string; name: string; type: string }
interface User { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string; avatar: string | null }

interface CurrentFilters {
  search: string;
  statuses: string[];
  priorities: string[];
  channelIds: string[];
  clinicIds: string[];
  assignedToIds: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface LeadsInboxClientProps {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  clinics: Clinic[];
  channels: Channel[];
  users: User[];
  currentFilters: CurrentFilters;
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

const PRIORITY_MAP: Record<string, { label: string; color: string; dot: string }> = {
  BAJA: { label: "Baja", color: "text-neutral-500", dot: "bg-neutral-300" },
  MEDIA: { label: "Media", color: "text-blue-600", dot: "bg-blue-400" },
  ALTA: { label: "Alta", color: "text-orange-500", dot: "bg-orange-400" },
  URGENTE: { label: "Urgente", color: "text-red-600", dot: "bg-red-500" },
};

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? "w-3.5 h-3.5";
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

function UserAvatar({ name, avatar, size = "sm" }: { name: string; avatar?: string | null; size?: "sm" | "xs" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const sizeClass = size === "xs" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-xs";
  if (avatar) return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover`} />;
  return (
    <div className={`${sizeClass} rounded-full bg-[#0F1F3C] text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

const QUICK_TABS: { label: string; status?: string; description: string }[] = [
  { label: "Todos", description: "Todos los leads" },
  { label: "Nuevos", status: "NUEVO", description: "Leads nuevos sin gestionar" },
  { label: "Sin Asignar", status: "SIN_ASIGNAR", description: "Leads sin asignar" },
  { label: "Pendientes", status: "PENDIENTE_RESPUESTA", description: "Pendiente de respuesta" },
  { label: "Citas", status: "CITA_CONFIRMADA", description: "Con cita confirmada" },
  { label: "Convertidos", status: "CONVERTIDO", description: "Leads convertidos" },
  { label: "Perdidos", status: "PERDIDO", description: "Leads perdidos" },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function LeadsInboxClient({
  leads,
  total,
  page,
  pageSize,
  clinics,
  channels,
  users,
  currentFilters,
}: LeadsInboxClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(currentFilters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);


  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("search", value);
      else params.delete("search");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }, [pathname, router, searchParams]);

  function setQuickTab(status?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("page");
    if (status) params.append("status", status);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.ceil(total / pageSize);

  const activeFilterCount =
    currentFilters.statuses.length +
    currentFilters.priorities.length +
    currentFilters.channelIds.length +
    currentFilters.clinicIds.length +
    currentFilters.assignedToIds.length +
    (currentFilters.dateFrom ? 1 : 0) +
    (currentFilters.dateTo ? 1 : 0);

  // ─── TABLE COLUMNS ────────────────────────────────────────────────────────

  const columns: ColumnDef<LeadRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="w-4 h-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
        />
      ),
      size: 44,
    },
    {
      id: "lead",
      header: "Lead",
      cell: ({ row }) => {
        const lead = row.original;
        const initials = [lead.firstName[0], lead.lastName?.[0]].filter(Boolean).join("").toUpperCase();
        const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#0F1F3C] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-neutral-900 text-sm truncate">{fullName}</p>
              {lead.phone && (
                <p className="text-xs text-neutral-500 truncate">{lead.phone}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "treatment",
      header: "Tratamiento",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-600 truncate block max-w-[120px]">
          {row.original.treatment ?? <span className="text-neutral-300 italic">—</span>}
        </span>
      ),
    },
    {
      id: "channel",
      header: "Canal",
      cell: ({ row }) => {
        const ch = row.original.channel;
        if (!ch) return <span className="text-neutral-300">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-sm text-neutral-600">
            <ChannelIcon type={ch.type} />
            <span className="truncate max-w-[80px]">{ch.name}</span>
          </div>
        );
      },
    },
    {
      id: "clinic",
      header: "Clínica",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-600 truncate block max-w-[100px]">
          {row.original.clinic?.name ?? <span className="text-neutral-300">—</span>}
        </span>
      ),
    },
    {
      id: "assignedTo",
      header: "Asignado a",
      cell: ({ row }) => {
        const a = row.original.assignedTo;
        if (!a) return <span className="text-xs text-neutral-400 italic">Sin asignar</span>;
        const name = (a.name ?? `${(a.firstName ?? "")} ${(a.lastName ?? "")}`.trim()) || a.email;
        return (
          <div className="flex items-center gap-1.5">
            <UserAvatar name={name} avatar={a.avatar} size="xs" />
            <span className="text-sm text-neutral-700 truncate max-w-[90px]">{name}</span>
          </div>
        );
      },
    },
    {
      id: "priority",
      header: "Prioridad",
      cell: ({ row }) => {
        const p = PRIORITY_MAP[row.original.priority] ?? { label: row.original.priority, color: "text-neutral-500", dot: "bg-neutral-300" };
        return (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${p.dot} flex-shrink-0`} />
            <span className={`text-xs font-medium ${p.color}`}>{p.label}</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) => {
        const s = STATUS_MAP[row.original.status] ?? { label: row.original.status, bg: "bg-neutral-100", text: "text-neutral-600" };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      header: "Creado",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-500">
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true, locale: es })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[160px] bg-white border border-neutral-200 rounded-xl shadow-lg py-1 outline-none"
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                  >
                    Ver lead
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                  onSelect={(e) => e.preventDefault()}
                >
                  <StatusChangeModal leadId={lead.id} currentStatus={lead.status}>
                    <span className="w-full">Cambiar estado</span>
                  </StatusChangeModal>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                  onSelect={async () => {
                    if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return;
                    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
                    router.refresh();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        );
      },
      size: 44,
    },
  ];

  const table = useReactTable({
    data: leads,
    columns,
    state: { rowSelection },
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── TOP BAR ── */}
      <div className="flex flex-col gap-3 px-6 pt-6 pb-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900">Leads</h1>
            <span className="bg-[#0F1F3C] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {total.toLocaleString("es-ES")}
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, tel, email…"
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white w-64"
              />
            </div>

            {/* Filter button (mobile + desktop) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                activeFilterCount > 0
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="bg-teal-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <NewLeadModal clinics={clinics} channels={channels} />

            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>

            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="relative md:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar leads…"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white w-full"
          />
        </div>

        {/* Quick tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_TABS.map((tab) => {
            const isActive =
              tab.status === undefined
                ? currentFilters.statuses.length === 0
                : currentFilters.statuses.length === 1 && currentFilters.statuses[0] === tab.status;
            return (
              <button
                key={tab.label}
                onClick={() => setQuickTab(tab.status)}
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

      {/* ── FILTERS PANEL ── */}
      {showFilters && (
        <div className="border-b border-neutral-200 bg-white">
          <div className="px-6 py-4">
            <LeadFilters
              clinics={clinics}
              channels={channels}
              users={users}
              activeStatuses={currentFilters.statuses}
              activePriorities={currentFilters.priorities}
              activeChannelIds={currentFilters.channelIds}
              activeClinicIds={currentFilters.clinicIds}
              activeAssignedIds={currentFilters.assignedToIds}
              dateFrom={currentFilters.dateFrom}
              dateTo={currentFilters.dateTo}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>
      )}

      {/* ── BULK ACTION BAR ── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-teal-50 border-b border-teal-200">
          <span className="text-sm font-medium text-teal-800">
            {selectedIds.length} seleccionado{selectedIds.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 ml-2">
            <button className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 border border-teal-300 bg-white px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
              <UserCheck className="w-3.5 h-3.5" />
              Asignar
            </button>
            <button className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 border border-teal-300 bg-white px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
              <Tag className="w-3.5 h-3.5" />
              Cambiar estado
            </button>
            <button className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 border border-teal-300 bg-white px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
            <button
              onClick={async () => {
                if (!confirm(`¿Eliminar ${selectedIds.length} lead${selectedIds.length !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
                await Promise.all(selectedIds.map((id) => fetch(`/api/leads/${id}`, { method: "DELETE" })));
                setRowSelection({});
                router.refresh();
              }}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 bg-white px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>
          <button
            onClick={() => setRowSelection({})}
            className="ml-auto text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-neutral-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-10 h-10 text-neutral-200" />
                      <p className="text-sm font-medium text-neutral-500">No hay leads que coincidan con los filtros</p>
                      <p className="text-xs text-neutral-400">Prueba a cambiar los filtros o crear un nuevo lead</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/leads/${row.original.id}`)}
                    className={`border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors ${
                      row.getIsSelected() ? "bg-teal-50/50" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-white flex-shrink-0">
          <p className="text-sm text-neutral-500">
            Mostrando{" "}
            <span className="font-medium text-neutral-700">
              {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}
            </span>{" "}
            de <span className="font-medium text-neutral-700">{total.toLocaleString("es-ES")}</span> leads
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                    pageNum === page
                      ? "bg-teal-600 border-teal-600 text-white font-medium"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE CARD LIST ── */}
      <div className="md:hidden flex flex-col flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-neutral-400">
              <Users className="w-10 h-10 text-neutral-200" />
              <p className="text-sm text-neutral-500">No hay leads</p>
            </div>
          ) : (
            leads.map((lead) => <LeadCard key={lead.id} lead={lead as never} />)
          )}
        </div>

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-white">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 text-sm text-neutral-600 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-sm text-neutral-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 text-sm text-neutral-600 disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
