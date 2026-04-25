"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { AuditLog, AuditAction } from "@prisma/client";
import {
  Shield,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatRelativeDate } from "@/lib/utils";

type AuditLogWithUser = AuditLog & {
  user: { id: string; name: string | null; email: string } | null;
};

type UserLite = { id: string; name: string | null; email: string };

interface AuditClientProps {
  logs: AuditLogWithUser[];
  total: number;
  page: number;
  totalPages: number;
  perPage: number;
  users: UserLite[];
  filters: {
    action: string;
    entity: string;
    userId: string;
    from: string;
    to: string;
  };
}

const ACTION_OPTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "STATUS_CHANGE",
  "ASSIGNMENT_CHANGE",
];

const ENTITY_OPTIONS = [
  "User",
  "Clinic",
  "Lead",
  "Appointment",
  "FormDefinition",
  "Channel",
  "AutomationRule",
  "CompanySettings",
];

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-teal-100 text-teal-700",
  LOGOUT: "bg-neutral-100 text-neutral-600",
  EXPORT: "bg-purple-100 text-purple-700",
  IMPORT: "bg-amber-100 text-amber-700",
  STATUS_CHANGE: "bg-indigo-100 text-indigo-700",
  ASSIGNMENT_CHANGE: "bg-pink-100 text-pink-700",
};

export function AuditClient({
  logs,
  total,
  page,
  totalPages,
  perPage,
  users,
  filters,
}: AuditClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<AuditLogWithUser | null>(null);

  const [actionFilter, setActionFilter] = useState(filters.action);
  const [entityFilter, setEntityFilter] = useState(filters.entity);
  const [userFilter, setUserFilter] = useState(filters.userId);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (actionFilter) params.set("action", actionFilter);
    else params.delete("action");
    if (entityFilter) params.set("entity", entityFilter);
    else params.delete("entity");
    if (userFilter) params.set("userId", userFilter);
    else params.delete("userId");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const resetFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setUserFilter("");
    setFrom("");
    setTo("");
    router.push(pathname);
  };

  const gotoPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const exportCsv = () => {
    const headers = [
      "Fecha",
      "Usuario",
      "Email",
      "Acción",
      "Entidad",
      "ID",
      "IP",
    ];
    const rows = logs.map((l) => [
      formatDateTime(l.createdAt),
      l.user?.name ?? "",
      l.user?.email ?? "",
      l.action,
      l.entity,
      l.entityId,
      l.ipAddress ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) =>
            typeof cell === "string" && /[",\n]/.test(cell)
              ? `"${cell.replace(/"/g, '""')}"`
              : String(cell)
          )
          .join(",")
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description="Historial de acciones realizadas en la empresa."
        actions={
          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        }
      />

      {/* Filter bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 text-sm font-semibold text-neutral-700">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Todos los usuarios</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Todas las acciones</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Todas las entidades</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={resetFilters}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Limpiar
          </button>
          <button
            onClick={applyFilters}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Sin registros"
          description="No hay eventos de auditoría con los filtros seleccionados."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Acción</th>
                    <th className="px-4 py-3 font-medium">Entidad</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div
                          className="text-sm text-neutral-700"
                          title={formatDateTime(l.createdAt)}
                        >
                          {formatRelativeDate(l.createdAt)}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {formatDateTime(l.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {l.user ? (
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-neutral-900">
                              {l.user.name ?? l.user.email}
                            </div>
                            <div className="truncate text-xs text-neutral-500">
                              {l.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            Sistema
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            ACTION_COLORS[l.action as AuditAction] ??
                            "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {l.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900">
                            {l.entity}
                          </span>
                          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">
                            {l.entityId.slice(0, 8)}
                          </code>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {l.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(l)}
                          className="inline-flex items-center gap-1 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-neutral-500">
              Mostrando {rangeStart}-{rangeEnd} de {total} registros
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => gotoPage(page - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <span className="px-3 text-xs text-neutral-600">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => gotoPage(page + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  Detalle del evento
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Fecha">{formatDateTime(selected.createdAt)}</Info>
                <Info label="Acción">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      ACTION_COLORS[selected.action as AuditAction] ??
                      "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {selected.action}
                  </span>
                </Info>
                <Info label="Usuario">
                  {selected.user?.name ?? selected.user?.email ?? "Sistema"}
                </Info>
                <Info label="Email">{selected.user?.email ?? "—"}</Info>
                <Info label="Entidad">{selected.entity}</Info>
                <Info label="ID">
                  <code className="font-mono text-xs">{selected.entityId}</code>
                </Info>
                <Info label="IP">{selected.ipAddress ?? "—"}</Info>
                <Info label="User-Agent">
                  <span className="block truncate text-xs">
                    {selected.userAgent ?? "—"}
                  </span>
                </Info>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Cambios
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-neutral-900 p-4 text-xs text-neutral-100">
                  {JSON.stringify(selected.changes ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex items-center justify-end border-t border-neutral-200 px-6 py-4">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-neutral-900">{children}</div>
    </div>
  );
}
