/**
 * GET  /api/sync/clinics  — Hub hace pull de las clínicas de esta app
 * POST /api/sync/clinics  — Hub propaga upsert de clínicas hacia esta app
 *
 * Auth: Bearer ${HUB_JWT_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function verifyHubAuth(req: NextRequest): boolean {
  const secret = process.env.HUB_JWT_SECRET ?? process.env.JWT_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

// ── GET — devuelve clínicas para que el Hub las indexe ───────────────────────
export async function GET(req: NextRequest) {
  if (!verifyHubAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companySlug = searchParams.get("company_slug");

  try {
    const where = companySlug
      ? { company: { slug: companySlug }, isActive: true }
      : { isActive: true };

    const clinics = await prisma.clinic.findMany({
      where,
      select: {
        id: true,
        name: true,
        isActive: true,
        city: true,
        company: { select: { slug: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      clinics.map((c) => ({
        id: c.id,
        name: c.name,
        active: c.isActive,
        city: c.city,
        company_slug: c.company.slug,
        company_name: c.company.name,
      }))
    );
  } catch (error) {
    console.error("[sync/clinics GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST — Hub propaga clínicas (upsert) ─────────────────────────────────────
const syncClinicsSchema = z.object({
  app_id: z.string().optional(),
  company_slug: z.string().min(1),
  clinics: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      active: z.boolean().default(true),
      city: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  if (!verifyHubAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = syncClinicsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { company_slug, clinics } = parsed.data;

  try {
    const company = await prisma.company.findUnique({
      where: { slug: company_slug },
    });

    if (!company) {
      return NextResponse.json(
        { error: `Company "${company_slug}" not found` },
        { status: 404 }
      );
    }

    let upserted = 0;
    let deactivated = 0;

    for (const clinic of clinics) {
      const existing = await prisma.clinic.findFirst({
        where: { id: clinic.id, companyId: company.id },
      });

      if (existing) {
        await prisma.clinic.update({
          where: { id: existing.id },
          data: {
            name: clinic.name,
            isActive: clinic.active,
            ...(clinic.city && { city: clinic.city }),
          },
        });
        if (!clinic.active) deactivated++;
        else upserted++;
      } else if (clinic.active) {
        // Create new clinic pushed from Hub
        // Generate a slug from name
        const slug = clinic.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        await prisma.clinic.create({
          data: {
            id: clinic.id, // use Hub's ID as primary key for traceability
            companyId: company.id,
            name: clinic.name,
            slug: `${slug}-${Date.now()}`,
            city: clinic.city,
            isActive: true,
          },
        });
        upserted++;
      }
    }

    return NextResponse.json({ ok: true, upserted, deactivated });
  } catch (error) {
    console.error("[sync/clinics POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
