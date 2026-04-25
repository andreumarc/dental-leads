import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignSchema = z.object({
  assignedToId: z.string().nullable(),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.lead.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { assignedToId, reason } = parsed.data;

    // If assigning to a user, verify they belong to same company
    if (assignedToId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: assignedToId, companyId },
      });
      if (!targetUser) {
        return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          assignedToId,
          status: assignedToId ? "ASIGNADO" : "SIN_ASIGNAR",
          lastInteractionAt: new Date(),
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true, firstName: true, lastName: true, avatar: true } },
        },
      });

      await tx.leadAssignmentHistory.create({
        data: {
          leadId: id,
          assignedToId,
          assignedById: session.user.id,
          reason,
        },
      });

      const assigneeName = lead.assignedTo
        ? (lead.assignedTo.name ?? `${lead.assignedTo.firstName ?? ""} ${lead.assignedTo.lastName ?? ""}`.trim())
        : "Sin asignar";

      await tx.leadEvent.create({
        data: {
          leadId: id,
          userId: session.user.id,
          type: "ASIGNADO",
          description: assignedToId
            ? `Lead asignado a ${assigneeName}`
            : "Lead desasignado",
          metadata: { assignedToId, reason },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          leadId: id,
          action: "ASSIGNMENT_CHANGE",
          entity: "Lead",
          entityId: id,
          changes: { from: existing.assignedToId, to: assignedToId, reason },
        },
      });

      return lead;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[POST /api/leads/[id]/assign]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
