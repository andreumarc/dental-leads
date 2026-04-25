import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { LeadStatus, LeadPriority } from "@prisma/client";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const patchLeadSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  treatment: z.string().optional(),
  status: z.enum([
    "NUEVO", "SIN_ASIGNAR", "ASIGNADO", "PENDIENTE_RESPUESTA", "RESPONDIDO",
    "PENDIENTE_LLAMADA", "EN_SEGUIMIENTO", "CITA_SOLICITADA", "CITA_PROPUESTA",
    "CITA_CONFIRMADA", "NO_LOCALIZADO", "NO_INTERESADO", "DUPLICADO", "SPAM",
    "CONVERTIDO", "PERDIDO",
  ] as const).optional(),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  clinicId: z.string().optional(),
  channelId: z.string().optional(),
  campaignId: z.string().optional(),
  initialMessage: z.string().optional(),
  gdprConsent: z.boolean().optional(),
  lossReason: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
});

// ─── GET /api/leads/[id] ──────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
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

    const lead = await prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        clinic: true,
        assignedTo: {
          select: { id: true, name: true, email: true, firstName: true, lastName: true, avatar: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, firstName: true, lastName: true },
        },
        channelRef: true,
        campaign: true,
        tags: true,
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
          },
        },
        appointments: {
          orderBy: { createdAt: "desc" },
          include: {
            clinic: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        },
        assignmentHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        },
        attachments: true,
        conversations: {
          include: {
            channel: true,
            messages: { orderBy: { createdAt: "asc" }, take: 50 },
          },
        },
        _count: {
          select: { events: true, notes: true, appointments: true, conversations: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error("[GET /api/leads/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

// ─── PATCH /api/leads/[id] ────────────────────────────────────────────────────

export async function PATCH(
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

    // Verify lead ownership
    const existing = await prisma.lead.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const statusChanged = data.status && data.status !== existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          ...data,
          email: data.email || undefined,
          gdprConsentDate: data.gdprConsent === true && !existing.gdprConsent ? new Date() : undefined,
          lastInteractionAt: new Date(),
        },
      });

      if (statusChanged) {
        const statusLabels: Record<LeadStatus, string> = {
          NUEVO: "Nuevo",
          SIN_ASIGNAR: "Sin asignar",
          ASIGNADO: "Asignado",
          PENDIENTE_RESPUESTA: "Pendiente respuesta",
          RESPONDIDO: "Respondido",
          PENDIENTE_LLAMADA: "Pendiente llamada",
          EN_SEGUIMIENTO: "En seguimiento",
          CITA_SOLICITADA: "Cita solicitada",
          CITA_PROPUESTA: "Cita propuesta",
          CITA_CONFIRMADA: "Cita confirmada",
          NO_LOCALIZADO: "No localizado",
          NO_INTERESADO: "No interesado",
          DUPLICADO: "Duplicado",
          SPAM: "Spam",
          CONVERTIDO: "Convertido",
          PERDIDO: "Perdido",
        };

        await tx.leadEvent.create({
          data: {
            leadId: id,
            userId: session.user.id,
            type: "ESTADO_CAMBIADO",
            description: `Estado cambiado de "${statusLabels[existing.status]}" a "${statusLabels[data.status!]}"${data.lossReason ? ` — Motivo: ${data.lossReason}` : ""}`,
            metadata: { from: existing.status, to: data.status, lossReason: data.lossReason },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          leadId: id,
          action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
          entity: "Lead",
          entityId: id,
          changes: data,
        },
      });

      return lead;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/leads/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

// ─── DELETE /api/leads/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
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

    await prisma.$transaction(async (tx) => {
      // Hard delete (cascade handles relations)
      await tx.lead.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          action: "DELETE",
          entity: "Lead",
          entityId: id,
          changes: { firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone },
        },
      });
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[DELETE /api/leads/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
