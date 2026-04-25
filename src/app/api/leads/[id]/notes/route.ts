import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNoteSchema = z.object({
  content: z.string().min(1, "El contenido es obligatorio"),
  isPrivate: z.boolean().optional().default(false),
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

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const { id } = await params;

    // Verify lead ownership
    const lead = await prisma.lead.findFirst({ where: { id, companyId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    const notes = await prisma.leadNote.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("[GET /api/leads/[id]/notes]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

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

    // Verify lead ownership
    const lead = await prisma.lead.findFirst({ where: { id, companyId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { content, isPrivate } = parsed.data;

    const note = await prisma.$transaction(async (tx) => {
      const newNote = await tx.leadNote.create({
        data: {
          leadId: id,
          userId: session.user.id,
          content,
          isPrivate,
        },
        include: {
          user: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
        },
      });

      await tx.leadEvent.create({
        data: {
          leadId: id,
          userId: session.user.id,
          type: "NOTA_AÑADIDA",
          description: isPrivate ? "Nota privada añadida" : `Nota añadida: ${content.substring(0, 100)}${content.length > 100 ? "…" : ""}`,
          metadata: { noteId: newNote.id, isPrivate },
        },
      });

      await tx.lead.update({
        where: { id },
        data: { lastInteractionAt: new Date() },
      });

      return newNote;
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/leads/[id]/notes]", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
