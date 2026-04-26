import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { toJson } from "@/lib/utils";

const createAppointmentSchema = z.object({
  leadId: z.string().min(1, "El lead es obligatorio"),
  clinicId: z.string().optional(),
  treatment: z.string().optional(),
  specialty: z.string().optional(),
  proposedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
  status: z.enum([
    "SOLICITADA", "PROPUESTA", "CONFIRMADA", "AGENDADA_EXTERNO",
    "CANCELADA", "REALIZADA", "NO_PRESENTADO",
  ] as const).optional().default("SOLICITADA"),
});

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
    const status = searchParams.getAll("status") as AppointmentStatus[];
    const clinicId = searchParams.getAll("clinicId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const where: Prisma.AppointmentWhereInput = {
      lead: { companyId },
    };

    if (status.length > 0) where.status = { in: status };
    if (clinicId.length > 0) where.clinicId = { in: clinicId };
    if (dateFrom || dateTo) {
      where.proposedAt = {};
      if (dateFrom) where.proposedAt.gte = new Date(dateFrom);
      if (dateTo) where.proposedAt.lte = new Date(dateTo);
    }

    const skip = (page - 1) * pageSize;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true, treatment: true, status: true },
          },
          clinic: { select: { id: true, name: true, city: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/appointments]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

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
    const parsed = createAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { leadId, clinicId, treatment, specialty, proposedAt, notes, status } = parsed.data;

    // Verify lead belongs to company
    const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          leadId,
          clinicId,
          userId: session.user.id,
          treatment,
          specialty,
          proposedAt: proposedAt ? new Date(proposedAt) : undefined,
          notes,
          status,
        },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true } },
          clinic: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // Update lead status
      const newLeadStatus =
        status === "CONFIRMADA" || status === "AGENDADA_EXTERNO"
          ? "CITA_CONFIRMADA"
          : "CITA_SOLICITADA";

      await tx.lead.update({
        where: { id: leadId },
        data: { status: newLeadStatus, lastInteractionAt: new Date() },
      });

      await tx.leadEvent.create({
        data: {
          leadId,
          userId: session.user.id,
          type: "CITA_CREADA",
          description: `Cita creada${treatment ? ` para ${treatment}` : ""}${proposedAt ? ` el ${new Date(proposedAt).toLocaleDateString("es-ES")}` : ""}`,
          metadata: { appointmentId: appt.id, status, treatment, proposedAt },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          leadId,
          action: "CREATE",
          entity: "Appointment",
          entityId: appt.id,
          changes: toJson({ leadId, clinicId, treatment, status, proposedAt }),
        },
      });

      return appt;
    });

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/appointments]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
