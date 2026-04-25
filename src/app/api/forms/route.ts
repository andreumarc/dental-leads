import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const formFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "phone", "textarea", "select", "checkbox", "date"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional().default(""),
  options: z.array(z.string()).optional(),
  order: z.number().int().default(0),
  mapToLead: z.string().optional(),
});

const createFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().min(1, "El slug es obligatorio").regex(/^[a-z0-9-]+$/, "Solo letras, números y guiones"),
  description: z.string().optional().nullable(),
  clinicId: z.string().optional().nullable(),
  webhookUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("").transform(() => null)),
  fields: z.array(formFieldSchema).optional().default([]),
});

// ─── GET /api/forms ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const forms = await prisma.formDefinition.findMany({
      where: { companyId },
      include: {
        clinic: { select: { id: true, name: true, slug: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: forms });
  } catch (error) {
    console.error("[GET /api/forms]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/forms ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Sin empresa asignada" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, slug, description, clinicId, webhookUrl, fields } = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.formDefinition.findFirst({
      where: { companyId, slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe un formulario con este slug" },
        { status: 409 }
      );
    }

    // Validate clinic ownership
    if (clinicId) {
      const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, companyId } });
      if (!clinic) {
        return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
      }
    }

    const form = await prisma.$transaction(async (tx) => {
      const newForm = await tx.formDefinition.create({
        data: {
          companyId,
          clinicId: clinicId ?? null,
          name,
          slug,
          description: description ?? null,
          webhookUrl: webhookUrl ?? null,
          isActive: true,
          isPublic: true,
        },
      });

      if (fields.length > 0) {
        await tx.formField.createMany({
          data: fields.map((f, i) => ({
            formId: newForm.id,
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            placeholder: f.placeholder ?? null,
            options: f.options ? JSON.parse(JSON.stringify(f.options)) : null,
            order: f.order ?? i,
            mapToLead: f.mapToLead ?? null,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          action: "CREATE",
          entity: "FormDefinition",
          entityId: newForm.id,
          changes: { name, slug, clinicId },
        },
      });

      return newForm;
    });

    return NextResponse.json({ success: true, data: form }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/forms]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
