"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS, hasPermission } from "@/lib/rbac";
import { getInitials } from "@/lib/utils";

interface AppSidebarProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    role: UserRole;
    companyId: string | null;
  };
  newLeadsCount?: number;
}

interface NavGroupItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  resource: string;
  action: string;
}

interface NavGroup {
  label: string;
  items: NavGroupItem[];
}

export function AppSidebar({ user, newLeadsCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navGroups: NavGroup[] = [
    {
      label: "Principal",
      items: [
        {
          href: "/dashboard",
          icon: LayoutDashboard,
          label: "Dashboard",
          resource: "dashboard",
          action: "view",
        },
        {
          href: "/dashboard/leads",
          icon: Users,
          label: "Leads",
          badge: newLeadsCount,
          resource: "leads",
          action: "view",
        },
      ],
    },
    {
      label: "Gestión",
      items: [
        {
          href: "/dashboard/citas",
          icon: Calendar,
          label: "Citas",
          resource: "appointments",
          action: "view",
        },
        {
          href: "/dashboard/formularios",
          icon: FileText,
          label: "Formularios",
          resource: "forms",
          action: "view",
        },
        {
          href: "/dashboard/canales",
          icon: Radio,
          label: "Canales",
          resource: "channels",
          action: "view",
        },
        {
          href: "/dashboard/automatizaciones",
          icon: Zap,
          label: "Automatizaciones",
          resource: "automations",
          action: "view",
        },
      ],
    },
    {
      label: "Organización",
      items: [
        {
          href: "/dashboard/clinicas",
          icon: Building2,
          label: "Clínicas",
          resource: "clinics",
          action: "view",
        },
        {
          href: "/dashboard/usuarios",
          icon: UserCog,
          label: "Usuarios",
          resource: "users",
          action: "view",
        },
        {
          href: "/dashboard/configuracion",
          icon: Settings,
          label: "Configuración",
          resource: "settings",
          action: "view",
        },
      ],
    },
    {
      label: "Sistema",
      items: [
        {
          href: "/dashboard/auditoria",
          icon: Shield,
          label: "Auditoría",
          resource: "audit",
          action: "view",
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const roleColors = ROLE_COLORS[user.role];
  const initials = getInitials(user.name);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen bg-[#0F1F3C] flex flex-col z-30 sidebar-transition",
        collapsed ? "sidebar-collapsed w-[72px]" : "sidebar-expanded w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center flex-shrink-0 shadow-md">
          <Users className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight truncate">
              Dental Leads
            </p>
            <p className="text-xs text-neutral-400 truncate">Impulsodent</p>
          </div>
        )}
      </div>

      {/* User info */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold overflow-hidden">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image ?? undefined} alt={user.name ?? ""} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {user.name}
            </p>
            <span
              className={cn(
                "inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5",
                roleColors.bg,
                roleColors.text
              )}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 space-y-0.5">
        {navGroups.map((group) => {
          // Filter items by permission
          const visibleItems = group.items.filter((item) =>
            hasPermission(user.role, item.resource, item.action)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="px-3 mb-1">
              {!collapsed && (
                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1 px-3">
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div className="border-t border-white/10 mb-2 mt-1" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex-shrink-0 border-t border-white/10">
        {/* Collapse toggle */}
        <div className={cn("px-3 py-2", collapsed && "px-2")}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-neutral-400",
              "hover:bg-white/10 hover:text-white transition-all duration-150",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>

        {/* Logout */}
        <div className={cn("px-3 pb-3", collapsed && "px-2")}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-neutral-400",
              "hover:bg-red-500/15 hover:text-red-300 transition-all duration-150",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
