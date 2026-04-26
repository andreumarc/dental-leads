import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { AuditClient } from "@/features/audit/AuditClient";
import type { AuditAction, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

interface SearchParams {
  page?: string;
  action?: string;
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "audit", "view")) {
    redirect("/dashboard");
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId && session.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PER_PAGE;

  // Build where
  const where: Prisma.AuditLogWhereInput =
    session.user.role === "SUPERADMIN" && !companyId
      ? {}
      : { companyId: companyId ?? undefined };

  if (sp.action) where.action = sp.action as AuditAction;
  if (sp.entity) where.entity = sp.entity;
  if (sp.userId) where.userId = sp.userId;
  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) where.createdAt.lte = new Date(sp.to);
  }

  const [logs, total, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PER_PAGE,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: companyId ? { companyId } : {},
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <AuditClient
      logs={logs}
      total={total}
      page={page}
      totalPages={totalPages}
      perPage={PER_PAGE}
      users={users}
      filters={{
        action: sp.action ?? "",
        entity: sp.entity ?? "",
        userId: sp.userId ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
