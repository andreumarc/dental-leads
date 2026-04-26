import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import type { LeadPriority } from "@prisma/client";
import { toJson } from "@/lib/utils";

const rowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  treatment: z.string().optional(),
  priority: z.string().optional(),
});

const bodySchema = z.object({
  clinicId: z.string().min(1),
  rows: z.array(rowSchema).min(1).max(5000),
});

function normalizePriority(v: string | undefined): LeadPriority {
  if (!v) return "MEDIA";
  const up = v.toUpperCase().trim();
  if (up === "BAJA" || up === "MEDIA" || up === "ALTA" || up === "URGENTE")
    return up as LeadPriority;
  return "MEDIA";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "leads", "import")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }
  const companyId = session.user.companyId ?? undefined;
  if (!companyId) {
    return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
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
  const { clinicId, rows } = parsed.data;

  // Verify clinic belongs to company
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, companyId },
    select: { id: true },
  });
  if (!clinic) {
    return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
  }

  const errors: string[] = [];
  const toCreate: Array<{
    companyId: string;
    clinicId: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    treatment: string | null;
    priority: LeadPriority;
    status: "NUEVO";
    createdById: string;
    channel: string;
  }> = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2: header row + 1-based
    const firstName = row.firstName?.trim();
    if (!firstName) {
      errors.push(`Fila ${rowNum}: sin nombre — omitida`);
      return;
    }
    if (row.phone) {
      const cleanPhone = row.phone.replace(/[\s\-().+]/g, "");
      if (cleanPhone.length < 7 || cleanPhone.length > 20) {
        errors.push(`Fila ${rowNum}: teléfono inválido "${row.phone}" — omitida`);
        return;
      }
    }
    if (row.email && !row.email.includes("@")) {
      errors.push(`Fila ${rowNum}: email inválido "${row.email}" — omitida`);
      return;
    }
    toCreate.push({
      companyId,
      clinicId,
      firstName,
      lastName: row.lastName?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      treatment: row.treatment?.trim() || null,
      priority: normalizePriority(row.priority),
      status: "NUEVO",
      createdById: session.user.id,
      channel: "csv_import",
    });
  });

  let created = 0;
  const CHUNK = 100;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const chunk = toCreate.slice(i, i + CHUNK);
    const res = await prisma.lead.createMany({
      data: chunk,
      skipDuplicates: false,
    });
    created += res.count;
  }

  await prisma.auditLog.create({
    data: {
      companyId,
      userId: session.user.id,
      action: "IMPORT",
      entity: "Lead",
      entityId: clinicId,
      changes: toJson({ total: rows.length, created, errors: errors.length, clinicId }),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      created,
      total: rows.length,
      errors,
    },
  });
}
