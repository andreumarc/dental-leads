import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug inválido")
    .optional(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  province: z.string().max(80).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ─── GET /api/clinics/[id] ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const clinic = await prisma.clinic.findFirst({
    where: { id, companyId },
    include: {
      _count: { select: { leads: true, userAccess: true } },
      clinicSettings: true,
    },
  });

  if (!clinic) {
    return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: clinic });
}

// ─── PATCH /api/clinics/[id] ──────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "clinics", "edit")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.clinic.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
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

  // Check slug uniqueness if changed
  if (data.slug && data.slug !== existing.slug) {
    const dup = await prisma.clinic.findFirst({
      where: { companyId, slug: data.slug, NOT: { id } },
    });
    if (dup) {
      return NextResponse.json(
        { success: false, error: "Ya existe otra clínica con ese slug" },
        { status: 409 }
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.address !== undefined) updates.address = data.address || null;
  if (data.city !== undefined) updates.city = data.city || null;
  if (data.province !== undefined) updates.province = data.province || null;
  if (data.phone !== undefined) updates.phone = data.phone || null;
  if (data.email !== undefined) updates.email = data.email || null;
  if (data.website !== undefined) updates.website = data.website || null;
  if (data.isActive !== undefined) updates.isActive = data.isActive;

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.clinic.update({
      where: { id },
      data: updates,
    });

    if (data.config) {
      const workingHours = (data.config as { workingHoursEnabled?: boolean })
        .workingHoursEnabled
        ? { enabled: true, start: "09:00", end: "20:00" }
        : { enabled: false };
      await tx.clinicSettings.upsert({
        where: { clinicId: id },
        update: { workingHours },
        create: {
          clinicId: id,
          workingHours,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "UPDATE",
        entity: "Clinic",
        entityId: id,
        changes: {
          before: {
            name: existing.name,
            slug: existing.slug,
            isActive: existing.isActive,
          },
          after: updates,
        },
      },
    });

    return c;
  });

  return NextResponse.json({ success: true, data: updated });
}

// ─── DELETE /api/clinics/[id] ─────────────────────────────────────────────────
// Soft delete: isActive=false

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "clinics", "delete")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.clinic.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.clinic.update({
      where: { id },
      data: { isActive: false },
    }),
    prisma.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "DELETE",
        entity: "Clinic",
        entityId: id,
        changes: { name: existing.name, slug: existing.slug, softDelete: true },
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
