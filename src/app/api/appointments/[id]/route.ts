import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchAppointmentSchema = z.object({
  clinicId: z.string().optional(),
  treatment: z.string().optional(),
  specialty: z.string().optional(),
  proposedAt: z.string().datetime({ offset: true }).optional(),
  confirmedAt: z.string().datetime({ offset: true }).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
  status: z.enum([
    "SOLICITADA", "PROPUESTA", "CONFIRMADA", "AGENDADA_EXTERNO",
    "CANCELADA", "REALIZADA", "NO_PRESENTADO",
  ] as const).optional(),
  duration: z.number().int().positive().optional(),
  externalRef: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        lead: { companyId },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, treatment: true, status: true } },
        clinic: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    console.error("[GET /api/appointments/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.appointment.findFirst({
      where: { id, lead: { companyId } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.update({
        where: { id },
        data: {
          ...data,
          proposedAt: data.proposedAt ? new Date(data.proposedAt) : undefined,
          confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : undefined,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true } },
          clinic: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // If status changed, update lead status accordingly
      if (data.status && data.status !== existing.status) {
        let leadStatus: string | undefined;
        if (data.status === "CONFIRMADA" || data.status === "AGENDADA_EXTERNO") leadStatus = "CITA_CONFIRMADA";
        else if (data.status === "PROPUESTA") leadStatus = "CITA_PROPUESTA";
        else if (data.status === "SOLICITADA") leadStatus = "CITA_SOLICITADA";

        if (leadStatus) {
          await tx.lead.update({
            where: { id: existing.leadId },
            data: { status: leadStatus as never, lastInteractionAt: new Date() },
          });
        }

        await tx.leadEvent.create({
          data: {
            leadId: existing.leadId,
            userId: session.user.id,
            type: "ESTADO_CAMBIADO",
            description: `Estado de cita cambiado a ${data.status}`,
            metadata: { appointmentId: id, from: existing.status, to: data.status },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          leadId: existing.leadId,
          action: "UPDATE",
          entity: "Appointment",
          entityId: id,
          changes: data,
        },
      });

      return appt;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/appointments/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.appointment.findFirst({
      where: { id, lead: { companyId } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: { status: "CANCELADA" },
      });

      await tx.leadEvent.create({
        data: {
          leadId: existing.leadId,
          userId: session.user.id,
          type: "ESTADO_CAMBIADO",
          description: "Cita cancelada",
          metadata: { appointmentId: id },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          leadId: existing.leadId,
          action: "DELETE",
          entity: "Appointment",
          entityId: id,
        },
      });
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[DELETE /api/appointments/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
