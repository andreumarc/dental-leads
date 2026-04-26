import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import type { AuditAction, Prisma } from "@prisma/client";

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "audit", "view")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }

  const companyId = session.user.companyId ?? undefined;
  const isSuperadmin = session.user.role === "SUPERADMIN";
  if (!companyId && !isSuperadmin) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(
      1,
      parseInt(searchParams.get("perPage") ?? String(DEFAULT_PER_PAGE), 10) ||
        DEFAULT_PER_PAGE
    )
  );
  const format = searchParams.get("format");
  const action = searchParams.get("action");
  const entity = searchParams.get("entity");
  const userId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.AuditLogWhereInput =
    isSuperadmin && !companyId ? {} : { companyId: companyId ?? undefined };
  if (action) where.action = action as AuditAction;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  if (format === "csv") {
    if (!hasPermission(session.user.role, "audit", "export")) {
      return NextResponse.json({ success: false, error: "Sin permisos de exportación" }, { status: 403 });
    }
    const all = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { user: { select: { name: true, email: true } } },
    });
    const headers = ["Fecha", "Usuario", "Email", "Acción", "Entidad", "ID", "IP"];
    const rows = all.map((l) => [
      l.createdAt.toISOString(),
      l.user?.name ?? "",
      l.user?.email ?? "",
      l.action,
      l.entity,
      l.entityId,
      l.ipAddress ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) =>
            typeof cell === "string" && /[",\n]/.test(cell)
              ? `"${cell.replace(/"/g, '""')}"`
              : String(cell)
          )
          .join(",")
      )
      .join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      logs,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
}
