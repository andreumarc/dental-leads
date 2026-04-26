/**
 * POST /api/sync/user
 *
 * Endpoint de sincronización Hub ImpulsoDent → Dental Leads.
 * Recibe el payload canónico del Hub cuando un superadmin da de alta
 * o modifica un usuario desde el panel central.
 *
 * Auth: Bearer ${HUB_JWT_SECRET}
 *
 * Payload:
 * {
 *   email: string
 *   name: string
 *   role: "superadmin" | "admin" | "direccion" | "rrhh" | "gestor" | "empleado" | "demo"
 *   company_slug: string
 *   clinic_ids: string[] | "ALL"
 *   subscription_plan?: string
 *   subscription_expires_at?: string
 *   max_clinics?: number
 *   active?: boolean          // false = desactivar usuario
 * }
 *
 * Comportamiento:
 * 1. Upsert User por email vinculado a la Company (por slug).
 * 2. clinic_ids = "ALL"   → acceso a todas las clínicas activas de la empresa
 * 3. clinic_ids = []       → elimina todos los accesos de clínica
 * 4. clinic_ids = [id,...] → reemplaza exactamente esos accesos
 * 5. active = false        → desactiva el usuario (no lo elimina)
 * 6. Crea AuditLog de la operación.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mapHubRole } from "@/lib/rbac";
import bcryptjs from "bcryptjs";
import { toJson } from "@/lib/utils";

const syncUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().min(1),
  company_slug: z.string().min(1),
  clinic_ids: z.union([z.array(z.string()), z.literal("ALL")]).optional(),
  subscription_plan: z.string().optional(),
  subscription_expires_at: z.string().optional(),
  max_clinics: z.number().optional(),
  active: z.boolean().optional().default(true),
});

function verifyHubAuth(req: NextRequest): boolean {
  const secret =
    process.env.HUB_JWT_SECRET ?? process.env.JWT_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!verifyHubAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Payload validation ────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  const parsed = syncUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    email,
    name,
    role: hubRole,
    company_slug,
    clinic_ids,
    active,
  } = parsed.data;

  const localRole = mapHubRole(hubRole);

  try {
    // ── Resolve company ───────────────────────────────────────────────────────
    const company = await prisma.company.findUnique({
      where: { slug: company_slug },
    });

    if (!company) {
      return NextResponse.json(
        { error: `Company with slug "${company_slug}" not found` },
        { status: 404 }
      );
    }

    // ── Upsert user ───────────────────────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          companyId: company.id,
          role: localRole,
          isActive: active,
        },
      });
    } else {
      // New user — generate a temporary random password.
      // The user will authenticate via Hub SSO JWT (not password login).
      const tempPassword = await bcryptjs.hash(
        Math.random().toString(36).slice(2) + Date.now().toString(36),
        10
      );

      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          companyId: company.id,
          role: localRole,
          isActive: active,
          emailVerified: new Date(),
        },
      });

      // Create credentials account entry
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: email.toLowerCase(),
          access_token: tempPassword,
        },
      });
    }

    // ── Clinic access ──────────────────────────────────────────────────────────
    if (clinic_ids !== undefined) {
      if (clinic_ids === "ALL") {
        // Grant access to all active clinics in the company
        const allClinics = await prisma.clinic.findMany({
          where: { companyId: company.id, isActive: true },
          select: { id: true },
        });

        await prisma.userClinicAccess.deleteMany({
          where: { userId: user.id },
        });

        if (allClinics.length > 0) {
          await prisma.userClinicAccess.createMany({
            data: allClinics.map((c) => ({
              userId: user.id,
              clinicId: c.id,
              role: localRole,
            })),
            skipDuplicates: true,
          });
        }
      } else {
        // Replace exactly these clinic access rows
        await prisma.userClinicAccess.deleteMany({
          where: { userId: user.id },
        });

        if (clinic_ids.length > 0) {
          // Resolve clinic IDs scoped to this company
          const validClinics = await prisma.clinic.findMany({
            where: {
              id: { in: clinic_ids },
              companyId: company.id,
            },
            select: { id: true },
          });

          if (validClinics.length > 0) {
            await prisma.userClinicAccess.createMany({
              data: validClinics.map((c) => ({
                userId: user.id,
                clinicId: c.id,
                role: localRole,
              })),
              skipDuplicates: true,
            });
          }
        }
        // clinic_ids = [] → all access deleted, user has no clinic access
      }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: existingUser ? "UPDATE" : "CREATE",
        entity: "User",
        entityId: user.id,
        changes: toJson({ source: "hub_sync", email, role: localRole, active, clinic_ids: clinic_ids ?? "unchanged" }),
        ipAddress:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip") ??
          undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      action: existingUser ? "updated" : "created",
      role: localRole,
    });
  } catch (error) {
    console.error("[sync/user] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
