import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { toJson } from "@/lib/utils";

const updateSchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  language: z.string().min(2).max(10).optional(),
  defaultLeadAssignment: z.string().optional().nullable(),
  responseTimeAlert: z.number().int().min(1).max(10080).optional(),
  duplicateDetection: z.boolean().optional(),
  gdprRequired: z.boolean().optional(),
  notifications: z.record(z.string(), z.unknown()).optional(),
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "settings", "view")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

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
    prisma.companySettings.findUnique({ where: { companyId } }),
  ]);

  return NextResponse.json({ success: true, data: { company, settings } });
}

// ─── POST /api/settings ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "settings", "editCompany")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.companySettings.findUnique({
    where: { companyId },
  });

  const mergedNotifications = {
    ...((existing?.notifications as Record<string, unknown> | null) ?? {}),
    ...(data.notifications ?? {}),
  };

  const payload = {
    timezone: data.timezone ?? existing?.timezone ?? "Europe/Madrid",
    language: data.language ?? existing?.language ?? "es",
    defaultLeadAssignment:
      data.defaultLeadAssignment ?? existing?.defaultLeadAssignment ?? null,
    responseTimeAlert:
      data.responseTimeAlert ?? existing?.responseTimeAlert ?? 60,
    duplicateDetection:
      data.duplicateDetection ?? existing?.duplicateDetection ?? true,
    gdprRequired: data.gdprRequired ?? existing?.gdprRequired ?? true,
    notifications: toJson(mergedNotifications),
  };

  const result = await prisma.$transaction(async (tx) => {
    const settings = await tx.companySettings.upsert({
      where: { companyId },
      update: payload,
      create: {
        companyId,
        ...payload,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "UPDATE",
        entity: "CompanySettings",
        entityId: settings.id,
        changes: toJson({ before: existing ? { timezone: existing.timezone, language: existing.language, responseTimeAlert: existing.responseTimeAlert, gdprRequired: existing.gdprRequired, duplicateDetection: existing.duplicateDetection } : null, after: data }),
      },
    });

    return settings;
  });

  return NextResponse.json({ success: true, data: result });
}
