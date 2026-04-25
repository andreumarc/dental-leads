"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number | string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  active = false,
  collapsed = false,
  onClick,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group relative",
        active
          ? "bg-[#1a3460] text-white font-medium shadow-sm"
          : "text-neutral-300 hover:bg-white/10 hover:text-white",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "flex-shrink-0 transition-colors",
          active ? "text-white" : "text-neutral-400 group-hover:text-white",
          collapsed ? "w-5 h-5" : "w-4 h-4"
        )}
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>

          {badge !== undefined && badge !== 0 && (
            <span
              className={cn(
                "flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center",
                active
                  ? "bg-[#0D9488] text-white"
                  : "bg-[#0D9488]/80 text-white group-hover:bg-[#0D9488]"
              )}
            >
              {typeof badge === "number" && badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div
          className={cn(
            "absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded whitespace-nowrap",
            "opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50",
            "shadow-lg"
          )}
        >
          {label}
          {badge !== undefined && badge !== 0 && (
            <span className="ml-1.5 px-1 py-0.5 bg-[#0D9488] rounded text-xs">
              {typeof badge === "number" && badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
      )}

      {/* Collapsed badge dot */}
      {collapsed && badge !== undefined && badge !== 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-[#0D9488] rounded-full" />
      )}
    </Link>
  );
}
