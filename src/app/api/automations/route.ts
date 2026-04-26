import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  trigger: z.object({ type: z.string() }),
  conditions: z.array(z.record(z.string(), z.unknown())).default([]),
  actions: z.array(z.record(z.string(), z.unknown())).min(1),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "automations", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.automationRule.findMany({
    where: { companyId: session.user.companyId ?? undefined },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "automations", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const rule = await prisma.automationRule.create({
    data: {
      companyId: session.user.companyId!,
      name: data.name,
      trigger: data.trigger as import("@prisma/client").Prisma.InputJsonValue,
      conditions: data.conditions as import("@prisma/client").Prisma.InputJsonValue,
      actions: data.actions as import("@prisma/client").Prisma.InputJsonValue,
      isActive: data.isActive,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId!,
      userId: session.user.id,
      action: "CREATE",
      entity: "AutomationRule",
      entityId: rule.id,
      changes: { after: data } as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
