import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { LeadStatus, LeadPriority, Prisma } from "@prisma/client";
import { toJson } from "@/lib/utils";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const createLeadSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().optional(),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  treatment: z.string().optional(),
  channelId: z.string().optional(),
  clinicId: z.string().min(1, "La clínica es obligatoria"),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional().default("MEDIA"),
  initialMessage: z.string().optional(),
  gdprConsent: z.boolean().optional().default(false),
});

// ─── GET /api/leads ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") ?? "";
    const status = searchParams.getAll("status") as LeadStatus[];
    const priority = searchParams.getAll("priority") as LeadPriority[];
    const channelId = searchParams.getAll("channelId");
    const clinicId = searchParams.getAll("clinicId");
    const assignedToId = searchParams.getAll("assignedToId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const where: Prisma.LeadWhereInput = {
      companyId,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status.length > 0) where.status = { in: status };
    if (priority.length > 0) where.priority = { in: priority };
    if (channelId.length > 0) where.channelId = { in: channelId };
    if (clinicId.length > 0) where.clinicId = { in: clinicId };
    if (assignedToId.length > 0) where.assignedToId = { in: assignedToId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const skip = (page - 1) * pageSize;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          treatment: true,
          status: true,
          priority: true,
          gdprConsent: true,
          isConverted: true,
          isDuplicate: true,
          lastInteractionAt: true,
          createdAt: true,
          companyId: true,
          clinicId: true,
          assignedToId: true,
          channelId: true,
          channel: true,
          clinic: { select: { id: true, name: true, slug: true, city: true } },
          assignedTo: { select: { id: true, name: true, email: true, firstName: true, lastName: true, avatar: true } },
          tags: { select: { id: true, name: true, color: true } },
          _count: { select: { appointments: true, notes: true, events: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/leads]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { firstName, lastName, phone, email, treatment, channelId, clinicId, priority, initialMessage, gdprConsent } = parsed.data;

    // Verify clinic belongs to company
    const clinic = await prisma.clinic.findFirst({
      where: { id: clinicId, companyId },
    });
    if (!clinic) {
      return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
    }

    // Create lead + initial event + audit log in a transaction
    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          companyId,
          clinicId,
          firstName,
          lastName,
          phone,
          email: email || undefined,
          treatment,
          channelId,
          priority,
          initialMessage,
          gdprConsent: gdprConsent ?? false,
          gdprConsentDate: gdprConsent ? new Date() : undefined,
          status: "NUEVO",
          createdById: session.user.id,
        },
      });

      await tx.leadEvent.create({
        data: {
          leadId: newLead.id,
          userId: session.user.id,
          type: "CREADO",
          description: `Lead creado manualmente por ${session.user.name}`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          leadId: newLead.id,
          action: "CREATE",
          entity: "Lead",
          entityId: newLead.id,
          changes: toJson({ firstName, lastName, phone, email, clinicId, priority, status: "NUEVO" }),
        },
      });

      return newLead;
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/leads]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
