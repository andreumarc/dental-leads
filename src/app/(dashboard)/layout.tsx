import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch clinics for the company (for clinic selector in topbar)
  const clinics = session.user.companyId
    ? await prisma.clinic.findMany({
        where: {
          companyId: session.user.companyId!,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  // Count new (NUEVO) leads for badge in sidebar
  const newLeadsCount = session.user.companyId
    ? await prisma.lead.count({
        where: {
          companyId: session.user.companyId!,
          status: "NUEVO",
        },
      })
    : 0;

  return (
    <SessionProvider session={session}>
      <DashboardShell
        user={session.user}
        clinics={clinics}
        newLeadsCount={newLeadsCount}
      >
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
