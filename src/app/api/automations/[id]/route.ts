import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  trigger: z.object({ type: z.string() }).optional(),
  conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

async function getRuleOrFail(id: string, companyId: string) {
  const rule = await prisma.automationRule.findFirst({
    where: { id, companyId },
  });
  return rule;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "automations", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rule = await getRuleOrFail(id, session.user.companyId ?? "");
  if (!rule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ rule });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "automations", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rule = await getRuleOrFail(id, session.user.companyId ?? "");
  if (!rule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.trigger !== undefined && { trigger: data.trigger as import("@prisma/client").Prisma.InputJsonValue }),
      ...(data.conditions !== undefined && {
        conditions: data.conditions as import("@prisma/client").Prisma.InputJsonValue,
      }),
      ...(data.actions !== undefined && { actions: data.actions as import("@prisma/client").Prisma.InputJsonValue }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId!,
      userId: session.user.id,
      action: "UPDATE",
      entity: "AutomationRule",
      entityId: id,
      changes: { before: rule, after: data } as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ rule: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "automations", "delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rule = await getRuleOrFail(id, session.user.companyId ?? "");
  if (!rule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.automationRule.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId!,
      userId: session.user.id,
      action: "DELETE",
      entity: "AutomationRule",
      entityId: id,
      changes: { before: rule } as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ success: true });
}
