"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Radio,
  Zap,
  Building2,
  UserCog,
  Settings,
  Shield,
  LogOut,
  X,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS, hasPermission } from "@/lib/rbac";
import { getInitials } from "@/lib/utils";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: UserRole;
    companyId: string | null;
  };
  newLeadsCount?: number;
}

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", resource: "dashboard", action: "view" },
      { href: "/dashboard/leads", icon: Users, label: "Leads", resource: "leads", action: "view", badgeKey: "leads" },
    ],
  },
  {
    label: "Gestión",
    items: [
      { href: "/dashboard/citas", icon: Calendar, label: "Citas", resource: "appointments", action: "view" },
      { href: "/dashboard/formularios", icon: FileText, label: "Formularios", resource: "forms", action: "view" },
      { href: "/dashboard/canales", icon: Radio, label: "Canales", resource: "channels", action: "view" },
      { href: "/dashboard/automatizaciones", icon: Zap, label: "Automatizaciones", resource: "automations", action: "view" },
    ],
  },
  {
    label: "Organización",
    items: [
      { href: "/dashboard/clinicas", icon: Building2, label: "Clínicas", resource: "clinics", action: "view" },
      { href: "/dashboard/usuarios", icon: UserCog, label: "Usuarios", resource: "users", action: "view" },
      { href: "/dashboard/configuracion", icon: Settings, label: "Configuración", resource: "settings", action: "view" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/auditoria", icon: Shield, label: "Auditoría", resource: "audit", action: "view" },
    ],
  },
];

export function MobileSidebar({
  open,
  onClose,
  user,
  newLeadsCount = 0,
}: MobileSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const roleColors = ROLE_COLORS[user.role];
  const initials = getInitials(user.name);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Drawer */}
        <Dialog.Content
          className={cn(
            "fixed top-0 left-0 z-50 h-full w-72 bg-[#0F1F3C] shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "duration-300 flex flex-col"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">
                  Dental Leads
                </p>
                <p className="text-xs text-neutral-400">Impulsodent</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold overflow-hidden">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">
                {user.name}
              </p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                roleColors.bg,
                roleColors.text
              )}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto sidebar-scroll py-3">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) =>
                hasPermission(user.role, item.resource, item.action)
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="px-3 mb-1">
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1 px-3">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        badge={item.badgeKey === "leads" ? newLeadsCount : undefined}
                        active={isActive(item.href)}
                        onClick={onClose}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
            <button
              onClick={() => {
                onClose();
                signOut({ callbackUrl: "/login" });
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-neutral-400 hover:bg-red-500/15 hover:text-red-300 transition-all duration-150"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
