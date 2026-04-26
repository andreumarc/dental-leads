"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";

interface TopBarProps {
  onMenuToggle: () => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    role: UserRole;
    companyId: string | null;
  };
  clinics?: { id: string; name: string; slug: string }[];
  currentClinicId?: string | null;
}

// Maps pathname segments to human-readable titles
function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];

  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    leads: "Leads",
    citas: "Citas",
    formularios: "Formularios",
    canales: "Canales",
    automatizaciones: "Automatizaciones",
    clinicas: "Clínicas",
    usuarios: "Usuarios",
    configuracion: "Configuración",
    auditoria: "Auditoría",
    perfil: "Mi Perfil",
  };

  return titles[last] ?? "Dashboard";
}

export function TopBar({ onMenuToggle, user, clinics = [], currentClinicId }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState(currentClinicId ?? "all");
  const [notificationCount] = useState(3); // Mock — replace with real count

  const pageTitle = getPageTitle(pathname);
  const initials = getInitials(user.name);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const clinicLabel =
    selectedClinicId === "all"
      ? "Todas las clínicas"
      : selectedClinic?.name ?? "Clínica";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/dashboard/leads?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center px-4 gap-4 sticky top-0 z-20">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-neutral-900 hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-md hidden md:block">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar leads, pacientes…"
            className={cn(
              "w-full h-9 pl-9 pr-4 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900",
              "placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent",
              "transition-all duration-150"
            )}
          />
        </form>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Clinic selector */}
        {clinics.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  "hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700",
                  "hover:bg-neutral-50 hover:border-neutral-300 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                )}
              >
                <Building2 className="w-4 h-4 text-neutral-400" />
                <span className="max-w-[120px] truncate">{clinicLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[200px] rounded-xl border border-neutral-200 bg-white shadow-lg p-1 text-sm animate-in fade-in-0 zoom-in-95"
              >
                <DropdownMenu.Item
                  onSelect={() => setSelectedClinicId("all")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer outline-none transition-colors",
                    selectedClinicId === "all"
                      ? "bg-teal-50 text-teal-700 font-medium"
                      : "text-neutral-700 hover:bg-neutral-50"
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  Todas las clínicas
                </DropdownMenu.Item>

                {clinics.length > 0 && (
                  <DropdownMenu.Separator className="my-1 border-t border-neutral-100" />
                )}

                {clinics.map((clinic) => (
                  <DropdownMenu.Item
                    key={clinic.id}
                    onSelect={() => setSelectedClinicId(clinic.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer outline-none transition-colors",
                      selectedClinicId === clinic.id
                        ? "bg-teal-50 text-teal-700 font-medium"
                        : "text-neutral-700 hover:bg-neutral-50"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#0D9488] flex-shrink-0" />
                    {clinic.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
          aria-label={`${notificationCount} notificaciones`}
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          )}
        </button>

        {/* User dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 h-9 px-2 rounded-lg border border-neutral-200 bg-white",
                "hover:bg-neutral-50 hover:border-neutral-300 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image ?? undefined} alt={user.name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-medium text-neutral-900 truncate max-w-[100px]">
                  {(user.name ?? user.email).split(" ")[0]}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[200px] rounded-xl border border-neutral-200 bg-white shadow-lg p-1 text-sm animate-in fade-in-0 zoom-in-95"
            >
              {/* User info */}
              <div className="px-3 py-2 mb-1 border-b border-neutral-100">
                <p className="font-medium text-neutral-900 text-sm truncate">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>

              <DropdownMenu.Item
                onSelect={() => router.push("/dashboard/perfil")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer outline-none text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <User className="w-4 h-4 text-neutral-400" />
                Mi Perfil
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={() => router.push("/dashboard/configuracion")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer outline-none text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-neutral-400" />
                Configuración
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 border-t border-neutral-100" />

              <DropdownMenu.Item
                onSelect={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer outline-none text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
