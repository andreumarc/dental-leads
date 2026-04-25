import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { SettingsClient } from "@/features/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "settings", "view")) {
    redirect("/dashboard");
  }
  const companyId = session.user.companyId;
  if (!companyId) redirect("/dashboard");

  const [company, settings] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        domain: true,
        plan: true,
        isActive: true,
      },
    }),
    prisma.companySettings.findUnique({
      where: { companyId },
    }),
  ]);

  if (!company) redirect("/dashboard");

  const canEdit = hasPermission(session.user.role, "settings", "editCompany");

  return (
    <SettingsClient
      company={company}
      settings={settings}
      canEdit={canEdit}
    />
  );
}
