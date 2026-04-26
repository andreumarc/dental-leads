import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { toJson } from "@/lib/utils";

const UserRoleEnum = z.enum([
  "SUPERADMIN",
  "ADMIN",
  "DIRECCION",
  "EMPLEADO",
  "GESTOR",
  "GESTOR",
  "GESTOR",
]);

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: UserRoleEnum.optional(),
  password: z.string().min(8).max(200).optional(),
  clinicIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/users/[id] ─────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "users", "view")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, companyId },
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
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

// ─── PATCH /api/users/[id] ───────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "users", "edit")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.user.findFirst({
    where: { id, companyId },
    include: { clinicAccess: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
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

  // Self-guard: can't deactivate or change own role
  if (id === session.user.id) {
    if (data.isActive === false) {
      return NextResponse.json(
        { success: false, error: "No puedes desactivar tu propio usuario" },
        { status: 400 }
      );
    }
    if (data.role && data.role !== existing.role) {
      return NextResponse.json(
        { success: false, error: "No puedes cambiar tu propio rol" },
        { status: 400 }
      );
    }
  }

  // Validate clinic IDs
  if (data.clinicIds) {
    if (data.clinicIds.length > 0) {
      const valid = await prisma.clinic.findMany({
        where: { id: { in: data.clinicIds }, companyId },
        select: { id: true },
      });
      if (valid.length !== data.clinicIds.length) {
        return NextResponse.json(
          { success: false, error: "Una o más clínicas no son válidas" },
          { status: 422 }
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updates.name = data.name;
    const parts = data.name.trim().split(/\s+/);
    updates.firstName = parts[0] ?? null;
    updates.lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }
  if (data.role !== undefined) updates.role = data.role;
  if (data.isActive !== undefined) updates.isActive = data.isActive;

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    // Replace clinic access if provided
    if (data.clinicIds) {
      await tx.userClinicAccess.deleteMany({ where: { userId: id } });
      if (data.clinicIds.length > 0) {
        await tx.userClinicAccess.createMany({
          data: data.clinicIds.map((clinicId) => ({
            userId: id,
            clinicId,
            role: data.role ?? existing.role,
          })),
        });
      }
    }

    // Replace password in credentials account if provided
    if (data.password) {
      const newHash = await bcryptjs.hash(data.password, 10);
      const credAccount = await tx.account.findFirst({
        where: { userId: id, provider: "credentials" },
      });
      if (credAccount) {
        await tx.account.update({
          where: { id: credAccount.id },
          data: { access_token: newHash },
        });
      } else {
        await tx.account.create({
          data: {
            userId: id,
            type: "credentials",
            provider: "credentials",
            providerAccountId: existing.email,
            access_token: newHash,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "UPDATE",
        entity: "User",
        entityId: id,
        changes: toJson({ before: { name: existing.name, role: existing.role, isActive: existing.isActive, clinicIds: existing.clinicAccess.map((a) => a.clinicId) }, after: { name: data.name ?? existing.name, role: data.role ?? existing.role, isActive: data.isActive ?? existing.isActive, clinicIds: data.clinicIds ?? existing.clinicAccess.map((a) => a.clinicId), passwordChanged: Boolean(data.password) } }),
      },
    });

    return user;
  });

  return NextResponse.json({ success: true, data: updated });
}

// ─── DELETE /api/users/[id] ──────────────────────────────────────────────────
// Soft delete: isActive = false

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "users", "delete")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json(
      { success: false, error: "No puedes eliminar tu propio usuario" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { isActive: false },
    }),
    prisma.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "DELETE",
        entity: "User",
        entityId: id,
        changes: toJson({ email: existing.email, name: existing.name, softDelete: true }),
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
