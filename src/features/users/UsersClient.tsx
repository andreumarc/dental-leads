"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import {
  UserPlus,
  Users as UsersIcon,
  Search,
  Edit3,
  Ban,
  CheckCircle2,
  MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleBadge } from "@/components/ui/badge";
import { ROLE_LABELS, ALL_ROLES } from "@/lib/rbac";
import { getInitials, formatRelativeDate } from "@/lib/utils";
import { UserModal } from "./UserModal";

type UserWithAccess = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  clinicAccess: Array<{
    id: string;
    userId: string;
    clinicId: string;
    role: UserRole;
    createdAt: Date;
    clinic: { id: string; name: string; slug: string; city: string | null };
  }>;
  _count: { clinicAccess: number; assignedLeads: number };
};

type ClinicLite = { id: string; name: string; slug: string; city: string | null };

interface UsersClientProps {
  users: UserWithAccess[];
  clinics: ClinicLite[];
  canManage: boolean;
  currentUserId: string;
  currentUserRole: UserRole;
}

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export function UsersClient({
  users,
  clinics,
  canManage,
  currentUserId,
  currentUserRole,
}: UsersClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithAccess | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !u.isActive) return false;
      if (statusFilter === "INACTIVE" && u.isActive) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const displayName = u.name ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        if (!displayName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const handleNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (u: UserWithAccess) => {
    setEditing(u);
    setModalOpen(true);
  };

  const handleToggleStatus = async (u: UserWithAccess) => {
    if (u.id === currentUserId) return;
    if (!canManage) return;
    setBusyId(u.id);
    try {
      await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeactivate = async (u: UserWithAccess) => {
    if (u.id === currentUserId) return;
    if (!canManage) return;
    if (!confirm(`¿Desactivar al usuario "${u.name ?? u.email}"?`)) return;
    setBusyId(u.id);
    try {
      await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const canActOn = (u: UserWithAccess): boolean => {
    if (!canManage) return false;
    if (u.id === currentUserId) return false;
    if (u.role === "SUPERADMIN" && currentUserRole === "ADMIN") return false;
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestiona el equipo, roles y accesos a clínicas."
        actions={
          canManage ? (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <UserPlus className="h-4 w-4" />
              Invitar usuario
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "ALL")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Todos los roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Estado: todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No se encontraron usuarios"
          description={
            users.length === 0
              ? "Invita a tu primer compañero para empezar."
              : "Prueba ajustando los filtros de búsqueda."
          }
          action={
            canManage && users.length === 0
              ? { label: "Invitar usuario", onClick: handleNew }
              : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Clínicas</th>
                  <th className="px-4 py-3 font-medium">Últ. acceso</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((u) => {
                  const displayName =
                    u.name?.trim() ||
                    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
                    u.email;
                  const isSelf = u.id === currentUserId;
                  const actionable = canActOn(u);
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                              u.id
                            )}`}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-900">
                              {displayName}
                              {isSelf && (
                                <span className="ml-2 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                                  TÚ
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-neutral-500">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                          {u._count.clinicAccess} clínica
                          {u._count.clinicAccess === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {formatRelativeDate(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={!actionable || busyId === u.id}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            u.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Activo
                            </>
                          ) : (
                            <>
                              <Ban className="h-3 w-3" />
                              Inactivo
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(u)}
                            disabled={!actionable}
                            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(u)}
                            disabled={!actionable || !u.isActive}
                            className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Desactivar"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => {
              const displayName =
                u.name?.trim() ||
                `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
                u.email;
              const isSelf = u.id === currentUserId;
              const actionable = canActOn(u);
              return (
                <div
                  key={u.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                        u.id
                      )}`}
                    >
                      {getInitials(displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium text-neutral-900">
                          {displayName}
                        </div>
                        {isSelf && (
                          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                            TÚ
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-neutral-500">
                        {u.email}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RoleBadge role={u.role} />
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                          {u._count.clinicAccess} clínicas
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {u.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    {actionable && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(u)}
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(u)}
                          disabled={!u.isActive}
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <UserModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        user={editing}
        clinics={clinics}
        onSaved={() => {
          setModalOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}
