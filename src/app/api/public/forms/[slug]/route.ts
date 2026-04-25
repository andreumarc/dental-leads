import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/public/forms/[slug] ────────────────────────────────────────────
// Returns the public form definition (fields only, no sensitive data)

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const form = await prisma.formDefinition.findFirst({
      where: { slug, isActive: true, isPublic: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        clinicId: true,
        fields: {
          select: {
            id: true,
            name: true,
            label: true,
            type: true,
            required: true,
            placeholder: true,
            options: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: form });
  } catch (error) {
    console.error("[GET /api/public/forms/[slug]]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/public/forms/[slug] ───────────────────────────────────────────
// Receives form submission, creates lead, fires webhook

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const form = await prisma.formDefinition.findFirst({
      where: { slug, isActive: true, isPublic: true },
      include: {
        fields: { orderBy: { order: "asc" } },
        clinic: { select: { id: true, companyId: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    // Parse body (support JSON and form-data)
    let data: Record<string, string | boolean | number> = {};
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        data[key] = value.toString();
      }
    } else {
      // Try JSON fallback
      try {
        data = await req.json();
      } catch {
        data = {};
      }
    }

    // Validate required fields
    const missingFields: string[] = [];
    for (const field of form.fields) {
      if (field.required) {
        const val = data[field.name];
        if (val === undefined || val === null || val === "" || val === false) {
          missingFields.push(field.label);
        }
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Campos obligatorios incompletos: ${missingFields.join(", ")}`,
          fields: missingFields,
        },
        { status: 422 }
      );
    }

    // Extract lead fields from submission data
    const firstName =
      (data.nombre as string) ??
      (data.name as string) ??
      (data.firstName as string) ??
      "Desconocido";

    const lastName =
      (data.apellido as string) ??
      (data.apellidos as string) ??
      (data.lastName as string) ??
      undefined;

    const phone =
      (data.telefono as string) ??
      (data.phone as string) ??
      undefined;

    const email =
      (data.email as string) ?? undefined;

    const treatment =
      (data.tratamiento as string) ??
      (data.treatment as string) ??
      (data.servicio as string) ??
      undefined;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;

    const userAgent = req.headers.get("user-agent") ?? undefined;

    const companyId = form.clinic?.companyId ?? form.companyId;

    // Transactional creation
    const result = await prisma.$transaction(async (tx) => {
      // Create the submission record
      const submission = await tx.formSubmission.create({
        data: {
          formId: form.id,
          data: data as Record<string, unknown>,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });

      // Create lead from submission data
      const lead = await tx.lead.create({
        data: {
          companyId,
          clinicId: form.clinicId ?? null,
          firstName,
          lastName: lastName ?? null,
          phone: phone ?? null,
          email: email ?? null,
          treatment: treatment ?? null,
          status: "NUEVO",
          priority: "MEDIA",
          gdprConsent: Boolean(data.gdpr || data.rgpd || data.consent || data.consentimiento),
          gdprConsentDate: Boolean(data.gdpr || data.rgpd || data.consent || data.consentimiento) ? new Date() : null,
          initialMessage: (data.mensaje as string) ?? (data.message as string) ?? null,
          source: "formulario",
          utmSource: (data.utm_source as string) ?? null,
          utmMedium: (data.utm_medium as string) ?? null,
          utmCampaign: (data.utm_campaign as string) ?? null,
          utmContent: (data.utm_content as string) ?? null,
          utmTerm: (data.utm_term as string) ?? null,
        },
      });

      // Link submission to lead
      await tx.formSubmission.update({
        where: { id: submission.id },
        data: { leadId: lead.id },
      });

      // Create lead event
      await tx.leadEvent.create({
        data: {
          leadId: lead.id,
          type: "FORMULARIO_RECIBIDO",
          description: `Lead recibido desde formulario web "${form.name}" (${form.slug})`,
          metadata: { formId: form.id, slug: form.slug },
        },
      });

      return { submission, lead };
    });

    // Trigger external webhook (non-blocking, fire and forget)
    if (form.webhookUrl) {
      const webhookPayload = {
        event: "FORMULARIO_RECIBIDO",
        timestamp: new Date().toISOString(),
        formSlug: form.slug,
        formName: form.name,
        leadId: result.lead.id,
        data: {
          firstName,
          lastName,
          phone,
          email,
          treatment,
          ...data,
        },
      };

      fetch(form.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(10000),
      }).catch((err) => {
        console.warn(`[Webhook] Failed to dispatch to ${form.webhookUrl}:`, err?.message);
      });
    }

    return NextResponse.json(
      {
        success: true,
        leadId: result.lead.id,
        submissionId: result.submission.id,
        message: "Formulario recibido correctamente. Nos pondremos en contacto contigo pronto.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/public/forms/[slug]]", error);
    return NextResponse.json({ success: false, error: "Error al procesar el formulario" }, { status: 500 });
  }
}
