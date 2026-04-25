/**
 * POST /api/sync/company
 *
 * Hub propaga metadata de empresa hacia Dental Leads.
 * Upserta Company por slug.
 *
 * Auth: Bearer ${HUB_JWT_SECRET}
 *
 * Payload:
 * {
 *   company_slug: string       — clave de tenant (invariante)
 *   name: string               — nombre de la empresa
 *   plan?: string              — plan de suscripción
 *   active?: boolean           — si false, desactiva la empresa
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function verifyHubAuth(req: NextRequest): boolean {
  const secret = process.env.HUB_JWT_SECRET ?? process.env.JWT_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

const syncCompanySchema = z.object({
  company_slug: z.string().min(1),
  name: z.string().min(1),
  plan: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  if (!verifyHubAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = syncCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { company_slug, name, plan, active } = parsed.data;

  try {
    const company = await prisma.company.upsert({
      where: { slug: company_slug },
      update: {
        name,
        isActive: active,
        ...(plan && { plan }),
      },
      create: {
        slug: company_slug,
        name,
        plan: plan ?? "starter",
        isActive: active,
      },
    });

    return NextResponse.json({
      ok: true,
      companyId: company.id,
      slug: company.slug,
    });
  } catch (error) {
    console.error("[sync/company]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
