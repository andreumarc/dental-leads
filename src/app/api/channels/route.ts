import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ChannelType } from "@prisma/client";
import { toJson } from "@/lib/utils";

const createChannelSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["WHATSAPP", "FORM_WEB", "LANDING", "MANUAL", "CALLCENTER", "CSV_IMPORT", "WEBHOOK", "GENERIC"]),
  clinicId: z.string().nullable().optional(),
  config: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type");

    const channels = await prisma.channel.findMany({
      where: { companyId, ...(type ? { type: type as ChannelType } : {}) },
      include: {
        clinic: { select: { id: true, name: true, slug: true } },
        integrationAccount: { select: { id: true, provider: true, accountId: true, metadata: true, updatedAt: true } },
        _count: { select: { leads: true, conversations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: channels });
  } catch (error) {
    console.error("[GET /api/channels]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const companyId = session.user.companyId ?? undefined;
    if (!companyId) return NextResponse.json({ success: false, error: "Sin empresa" }, { status: 403 });

    const body = await req.json();
    const parsed = createChannelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const { name, type, clinicId, config } = parsed.data;

    if (clinicId) {
      const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, companyId } });
      if (!clinic) return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
    }

    const channel = await prisma.$transaction(async (tx) => {
      const ch = await tx.channel.create({
        data: {
          companyId,
          clinicId: clinicId ?? null,
          name,
          type,
          status: "PENDIENTE_CONFIG",
          config: (config ?? null) as import("@prisma/client").Prisma.InputJsonValue,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          action: "CREATE",
          entity: "Channel",
          entityId: ch.id,
          changes: toJson({ name, type, clinicId }),
        },
      });

      return ch;
    });

    return NextResponse.json({ success: true, data: channel }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/channels]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
