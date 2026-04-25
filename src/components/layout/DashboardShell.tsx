"use client";

import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { MobileSidebar } from "./MobileSidebar";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: UserRole;
    companyId: string | null;
  };
  clinics: { id: string; name: string; slug: string }[];
  newLeadsCount: number;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  clinics,
  newLeadsCount,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <AppSidebar user={user} newLeadsCount={newLeadsCount} />
      </div>

      {/* Mobile sidebar sheet */}
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        newLeadsCount={newLeadsCount}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-250",
          "lg:pl-64" // default expanded; AppSidebar handles its own collapse state
        )}
        id="dashboard-main"
      >
        {/* Top bar */}
        <TopBar
          onMenuToggle={() => setMobileOpen(true)}
          user={user}
          clinics={clinics}
        />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
