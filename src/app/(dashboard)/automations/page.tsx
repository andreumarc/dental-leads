import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { AutomationsClient } from "@/features/automations/AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "automations", "view")) {
    redirect("/dashboard");
  }

  const [rules, users] = await Promise.all([
    prisma.automationRule.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  return (
    <AutomationsClient
      rules={rules}
      users={users}
      canManage={hasPermission(session.user.role, "automations", "manage")}
    />
  );
}
