/**
 * RBAC — Dental Leads
 *
 * Roles canónicos ImpulsoDent Hub (valores invariantes en toda la suite):
 *
 *  SUPERADMIN  — staff ImpulsoDent, acceso total cross-empresa
 *  ADMIN       — administra su empresa (antes ADMIN_EMPRESA)
 *  DIRECCION   — dirección clínica, ve todo pero no edita estructura
 *  RRHH        — recursos humanos (lectura operativa en Dental Leads)
 *  GESTOR      — operativo / day-to-day: callcenter, comercial, marketing
 *  EMPLEADO    — usuario básico: recepción, frontline
 *  DEMO        — solo lectura (usuario demo global)
 *
 * Mapping desde roles legacy:
 *   ADMIN_EMPRESA → ADMIN
 *   RECEPCION     → EMPLEADO
 *   CALLCENTER    → GESTOR
 *   MARKETING     → GESTOR
 *   COMERCIAL     → GESTOR
 */

import type { UserRole } from "@prisma/client";

export const ALL_ROLES: UserRole[] = [
  "SUPERADMIN",
  "ADMIN",
  "DIRECCION",
  "RRHH",
  "GESTOR",
  "EMPLEADO",
  "DEMO",
];

// Roles con capacidad de gestión operativa
const MANAGERS: UserRole[] = ["SUPERADMIN", "ADMIN", "DIRECCION"];
// Roles con acceso operativo (gestionan leads día a día)
const OPERATORS: UserRole[] = ["SUPERADMIN", "ADMIN", "DIRECCION", "GESTOR"];
// Roles que pueden ver pero no modificar mucho
const VIEWERS: UserRole[] = ["SUPERADMIN", "ADMIN", "DIRECCION", "RRHH", "GESTOR", "EMPLEADO"];

const PERMISSIONS: Record<string, Record<string, UserRole[]>> = {
  leads: {
    view: [...VIEWERS, "DEMO"],
    create: OPERATORS,
    edit: OPERATORS,
    delete: MANAGERS,
    assign: OPERATORS,
    export: [...MANAGERS, "GESTOR"],
    import: [...MANAGERS, "GESTOR"],
    changeStatus: [...OPERATORS, "EMPLEADO"],
    viewPrivateNotes: MANAGERS,
  },
  appointments: {
    view: [...VIEWERS, "DEMO"],
    create: [...OPERATORS, "EMPLEADO"],
    edit: [...OPERATORS, "EMPLEADO"],
    delete: MANAGERS,
    confirm: [...MANAGERS, "EMPLEADO"],
    cancel: [...OPERATORS, "EMPLEADO"],
  },
  forms: {
    view: [...VIEWERS, "DEMO"],
    manage: MANAGERS,
    create: MANAGERS,
    edit: MANAGERS,
    delete: ["SUPERADMIN", "ADMIN"],
    viewSubmissions: [...OPERATORS, "EMPLEADO"],
  },
  channels: {
    view: [...VIEWERS, "DEMO"],
    manage: ["SUPERADMIN", "ADMIN"],
    create: ["SUPERADMIN", "ADMIN"],
    edit: ["SUPERADMIN", "ADMIN"],
    delete: ["SUPERADMIN", "ADMIN"],
    viewLogs: MANAGERS,
  },
  automations: {
    view: MANAGERS,
    manage: ["SUPERADMIN", "ADMIN"],
    create: ["SUPERADMIN", "ADMIN"],
    edit: ["SUPERADMIN", "ADMIN"],
    delete: ["SUPERADMIN", "ADMIN"],
    toggle: ["SUPERADMIN", "ADMIN"],
  },
  clinics: {
    view: [...VIEWERS, "DEMO"],
    manage: ["SUPERADMIN", "ADMIN"],
    create: ["SUPERADMIN", "ADMIN"],
    edit: ["SUPERADMIN", "ADMIN"],
    delete: ["SUPERADMIN"],
    viewSettings: MANAGERS,
    editSettings: ["SUPERADMIN", "ADMIN"],
  },
  users: {
    view: MANAGERS,
    manage: ["SUPERADMIN", "ADMIN"],
    create: ["SUPERADMIN", "ADMIN"],
    edit: ["SUPERADMIN", "ADMIN"],
    delete: ["SUPERADMIN", "ADMIN"],
    changeRole: ["SUPERADMIN", "ADMIN"],
    deactivate: ["SUPERADMIN", "ADMIN"],
  },
  settings: {
    view: MANAGERS,
    manage: ["SUPERADMIN", "ADMIN"],
    editCompany: ["SUPERADMIN", "ADMIN"],
    editBilling: ["SUPERADMIN", "ADMIN"],
    editIntegrations: ["SUPERADMIN", "ADMIN"],
  },
  audit: {
    view: MANAGERS,
    export: ["SUPERADMIN", "ADMIN"],
  },
  reports: {
    view: [...MANAGERS, "GESTOR"],
    export: MANAGERS,
    viewRevenue: MANAGERS,
    viewAgentPerformance: MANAGERS,
  },
  campaigns: {
    view: [...MANAGERS, "GESTOR"],
    manage: ["SUPERADMIN", "ADMIN", "GESTOR"],
    create: ["SUPERADMIN", "ADMIN", "GESTOR"],
    edit: ["SUPERADMIN", "ADMIN", "GESTOR"],
    delete: ["SUPERADMIN", "ADMIN"],
    viewStats: [...MANAGERS, "GESTOR"],
  },
  conversations: {
    view: [...VIEWERS, "DEMO"],
    send: [...OPERATORS, "EMPLEADO"],
    manage: MANAGERS,
    viewAll: MANAGERS,
  },
  dashboard: {
    view: [...VIEWERS, "DEMO"],
    viewFullStats: [...MANAGERS, "GESTOR"],
    viewTeamStats: MANAGERS,
  },
};

/** SUPERADMIN siempre tiene acceso total */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: string
): boolean {
  if (role === "SUPERADMIN") return true;
  const resourcePermissions = PERMISSIONS[resource];
  if (!resourcePermissions) return false;
  const allowedRoles = resourcePermissions[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

export function canAccess(role: UserRole, resource: string): boolean {
  if (role === "SUPERADMIN") return true;
  const resourcePermissions = PERMISSIONS[resource];
  if (!resourcePermissions) return false;
  return Object.values(resourcePermissions).some((roles) =>
    roles.includes(role)
  );
}

export function getResourcePermissions(
  role: UserRole,
  resource: string
): Record<string, boolean> {
  const resourcePermissions = PERMISSIONS[resource];
  if (!resourcePermissions) return {};
  return Object.fromEntries(
    Object.entries(resourcePermissions).map(([action, roles]) => [
      action,
      role === "SUPERADMIN" || roles.includes(role),
    ])
  );
}

export function hasAllPermissions(
  role: UserRole,
  checks: Array<{ resource: string; action: string }>
): boolean {
  return checks.every(({ resource, action }) =>
    hasPermission(role, resource, action)
  );
}

export function hasAnyPermission(
  role: UserRole,
  checks: Array<{ resource: string; action: string }>
): boolean {
  return checks.some(({ resource, action }) =>
    hasPermission(role, resource, action)
  );
}

/** Etiquetas en español para UI */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  DIRECCION: "Dirección",
  RRHH: "RRHH",
  GESTOR: "Gestor",
  EMPLEADO: "Empleado",
  DEMO: "Demo",
};

/** Jerarquía numérica (mayor = más permisos) */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPERADMIN: 6,
  ADMIN: 5,
  DIRECCION: 4,
  RRHH: 3,
  GESTOR: 2,
  EMPLEADO: 1,
  DEMO: 0,
};

export function isRoleAtLeast(roleA: UserRole, roleB: UserRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

export function getAssignableRoles(role: UserRole): UserRole[] {
  const myLevel = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(
    (r) =>
      ROLE_HIERARCHY[r] < myLevel ||
      (role === "SUPERADMIN" && r === "SUPERADMIN")
  );
}

/** Colores de badge por rol */
export const ROLE_COLORS: Record<
  UserRole,
  { bg: string; text: string; border: string }
> = {
  SUPERADMIN: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  ADMIN: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  DIRECCION: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  RRHH: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  GESTOR: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  EMPLEADO: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  DEMO: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
};

/**
 * Mapeo de roles Hub (string del payload) → UserRole local.
 * Permite recibir roles canónicos del Hub y asignarlos directamente.
 */
export const HUB_ROLE_MAP: Record<string, UserRole> = {
  superadmin: "SUPERADMIN",
  admin: "ADMIN",
  direccion: "DIRECCION",
  rrhh: "RRHH",
  gestor: "GESTOR",
  empleado: "EMPLEADO",
  demo: "DEMO",
  // Aliases legacy (por si el Hub manda valores anteriores)
  SUPERADMIN: "SUPERADMIN",
  ADMIN_EMPRESA: "ADMIN",
  DIRECCION: "DIRECCION",
  RECEPCION: "EMPLEADO",
  CALLCENTER: "GESTOR",
  MARKETING: "GESTOR",
  COMERCIAL: "GESTOR",
};

export function mapHubRole(hubRole: string): UserRole {
  return HUB_ROLE_MAP[hubRole] ?? "EMPLEADO";
}

export type { UserRole };
export { ALL_ROLES as ROLES };
