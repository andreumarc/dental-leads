import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug inválido"),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  province: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  website: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  isActive: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ─── GET /api/clinics ─────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "clinics", "view")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const clinics = await prisma.clinic.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { leads: true, userAccess: true } },
    },
  });

  return NextResponse.json({ success: true, data: clinics });
}

// ─── POST /api/clinics ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "clinics", "create")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
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

  // Slug unique within company
  const existing = await prisma.clinic.findFirst({
    where: { companyId, slug: data.slug },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Ya existe una clínica con ese slug" },
      { status: 409 }
    );
  }

  const clinic = await prisma.$transaction(async (tx) => {
    const created = await tx.clinic.create({
      data: {
        companyId,
        name: data.name,
        slug: data.slug,
        address: data.address ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        isActive: data.isActive,
      },
    });

    if (data.config) {
      // Store "config" in clinicSettings JSON columns (best-effort)
      await tx.clinicSettings.create({
        data: {
          clinicId: created.id,
          workingHours: (data.config as { workingHoursEnabled?: boolean }).workingHoursEnabled
            ? { enabled: true, start: "09:00", end: "20:00" }
            : { enabled: false },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "CREATE",
        entity: "Clinic",
        entityId: created.id,
        changes: {
          name: data.name,
          slug: data.slug,
          city: data.city,
          isActive: data.isActive,
        },
      },
    });

    return created;
  });

  return NextResponse.json({ success: true, data: clinic }, { status: 201 });
}
