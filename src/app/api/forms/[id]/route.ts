import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { toJson } from "@/lib/utils";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const updateFormSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().nullable().optional(),
  clinicId: z.string().nullable().optional(),
  webhookUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  isActive: z.boolean().optional(),
  fields: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(["text", "email", "phone", "textarea", "select", "checkbox", "date"]),
        required: z.boolean().default(false),
        placeholder: z.string().optional().default(""),
        options: z.array(z.string()).optional(),
        order: z.number().int().default(0),
        mapToLead: z.string().optional(),
      })
    )
    .optional(),
});

// ─── GET /api/forms/[id] ─────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { searchParams } = req.nextUrl;
    const includeSubmissions = searchParams.get("submissions") === "1";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10", 10);

    const form = await prisma.formDefinition.findFirst({
      where: { id, companyId },
      include: {
        clinic: { select: { id: true, name: true, slug: true } },
        fields: { orderBy: { order: "asc" } },
        _count: { select: { submissions: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    if (includeSubmissions) {
      const skip = (page - 1) * pageSize;
      const [submissions, total] = await Promise.all([
        prisma.formSubmission.findMany({
          where: { formId: id },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        prisma.formSubmission.count({ where: { formId: id } }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          ...form,
          submissions,
          submissionCount: total,
        },
      });
    }

    return NextResponse.json({ success: true, data: form });
  } catch (error) {
    console.error("[GET /api/forms/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

// ─── PATCH /api/forms/[id] ───────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const existing = await prisma.formDefinition.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { fields, ...formData } = parsed.data;

    const form = await prisma.$transaction(async (tx) => {
      const updated = await tx.formDefinition.update({
        where: { id },
        data: {
          ...(formData.name !== undefined && { name: formData.name }),
          ...(formData.slug !== undefined && { slug: formData.slug }),
          ...(formData.description !== undefined && { description: formData.description }),
          ...(formData.clinicId !== undefined && { clinicId: formData.clinicId }),
          ...(formData.webhookUrl !== undefined && { webhookUrl: formData.webhookUrl }),
          ...(formData.isActive !== undefined && { isActive: formData.isActive }),
        },
      });

      if (fields !== undefined) {
        // Delete existing fields and recreate
        await tx.formField.deleteMany({ where: { formId: id } });
        if (fields.length > 0) {
          await tx.formField.createMany({
            data: fields.map((f, i) => ({
              formId: id,
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
      }

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          action: "UPDATE",
          entity: "FormDefinition",
          entityId: id,
          changes: toJson(formData),
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: form });
  } catch (error) {
    console.error("[PATCH /api/forms/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

// ─── DELETE /api/forms/[id] ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const existing = await prisma.formDefinition.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete via deactivation
      await tx.formDefinition.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: session.user.id,
          action: "DELETE",
          entity: "FormDefinition",
          entityId: id,
          changes: toJson({ name: existing.name, slug: existing.slug }),
        },
      });
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[DELETE /api/forms/[id]]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
