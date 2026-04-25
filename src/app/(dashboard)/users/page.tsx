import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { UsersClient } from "@/features/users/UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "users", "view")) {
    redirect("/dashboard");
  }

  const companyId = session.user.companyId;
  if (!companyId) redirect("/dashboard");

  const [users, clinics] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        clinicAccess: {
          include: {
            clinic: { select: { id: true, name: true, slug: true, city: true } },
          },
        },
        _count: { select: { clinicAccess: true, assignedLeads: true } },
      },
    }),
    prisma.clinic.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, slug: true, city: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canManage = hasPermission(session.user.role, "users", "manage");

  return (
    <UsersClient
      users={users}
      clinics={clinics}
      canManage={canManage}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
