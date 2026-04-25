import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { ClinicsClient } from "@/features/clinics/ClinicsClient";

export const dynamic = "force-dynamic";

export default async function ClinicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "clinics", "view")) {
    redirect("/dashboard");
  }
  const companyId = session.user.companyId;
  if (!companyId) redirect("/dashboard");

  const clinics = await prisma.clinic.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          leads: true,
          userAccess: true,
        },
      },
    },
  });

  const canManage = hasPermission(session.user.role, "clinics", "manage");

  return <ClinicsClient clinics={clinics} canManage={canManage} />;
}
