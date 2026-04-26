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

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  role: UserRoleEnum,
  password: z.string().min(8).max(200),
  clinicIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function GET() {
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

  const users = await prisma.user.findMany({
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
        select: {
          id: true,
          clinicId: true,
          role: true,
          clinic: { select: { id: true, name: true, slug: true, city: true } },
        },
      },
      _count: { select: { clinicAccess: true, assignedLeads: true } },
    },
  });

  return NextResponse.json({ success: true, data: users });
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "users", "create")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
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

  // Email unique within company
  const existing = await prisma.user.findFirst({
    where: { email: data.email },
    select: { id: true, companyId: true },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Ya existe un usuario con ese email" },
      { status: 409 }
    );
  }

  // Verify clinic IDs belong to this company
  if (data.clinicIds.length > 0) {
    const validClinics = await prisma.clinic.findMany({
      where: { id: { in: data.clinicIds }, companyId },
      select: { id: true },
    });
    if (validClinics.length !== data.clinicIds.length) {
      return NextResponse.json(
        { success: false, error: "Una o más clínicas no son válidas" },
        { status: 422 }
      );
    }
  }

  const passwordHash = await bcryptjs.hash(data.password, 10);

  // Split name into firstName/lastName if possible for legacy fields
  const parts = data.name.trim().split(/\s+/);
  const firstName = parts[0] ?? null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        companyId,
        name: data.name,
        firstName,
        lastName,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
        clinicAccess: {
          create: data.clinicIds.map((clinicId) => ({
            clinicId,
            role: data.role,
          })),
        },
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: data.email,
            access_token: passwordHash,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "CREATE",
        entity: "User",
        entityId: created.id,
        changes: toJson({ name: data.name, email: data.email, role: data.role, clinicIds: data.clinicIds, isActive: data.isActive }),
      },
    });

    return created;
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
