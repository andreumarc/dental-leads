import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LeadsInboxClient } from "@/features/leads/LeadsInboxClient";
import type { LeadStatus, LeadPriority, Prisma } from "@prisma/client";

interface LeadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string | string[];
    priority?: string | string[];
    channelId?: string | string[];
    clinicId?: string | string[];
    assignedToId?: string | string[];
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId ?? undefined;
  if (!companyId) redirect("/login");

  const sp = await searchParams;
  const search = sp.search ?? "";
  const statuses = toArray(sp.status) as LeadStatus[];
  const priorities = toArray(sp.priority) as LeadPriority[];
  const channelIds = toArray(sp.channelId);
  const clinicIds = toArray(sp.clinicId);
  const assignedToIds = toArray(sp.assignedToId);
  const dateFrom = sp.dateFrom;
  const dateTo = sp.dateTo;
  const page = parseInt(sp.page ?? "1", 10);
  const pageSize = 20;

  const where: Prisma.LeadWhereInput = { companyId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (statuses.length > 0) where.status = { in: statuses };
  if (priorities.length > 0) where.priority = { in: priorities };
  if (channelIds.length > 0) where.channelId = { in: channelIds };
  if (clinicIds.length > 0) where.clinicId = { in: clinicIds };
  if (assignedToIds.length > 0) where.assignedToId = { in: assignedToIds };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const skip = (page - 1) * pageSize;

  const [leads, total, clinics, channels, users] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        treatment: true,
        status: true,
        priority: true,
        gdprConsent: true,
        isConverted: true,
        isDuplicate: true,
        lastInteractionAt: true,
        createdAt: true,
        companyId: true,
        clinicId: true,
        assignedToId: true,
        channelId: true,
        channel: true,
        clinic: { select: { id: true, name: true, slug: true, city: true } },
        assignedTo: {
          select: { id: true, name: true, email: true, firstName: true, lastName: true, avatar: true },
        },
        tags: { select: { id: true, name: true, color: true } },
        _count: { select: { appointments: true, notes: true, events: true } },
      },
    }),
    prisma.lead.count({ where }),
    prisma.clinic.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.channel.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, firstName: true, lastName: true, email: true, avatar: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <LeadsInboxClient
      leads={leads as never}
      total={total}
      page={page}
      pageSize={pageSize}
      clinics={clinics}
      channels={channels}
      users={users}
      currentFilters={{
        search,
        statuses,
        priorities,
        channelIds,
        clinicIds,
        assignedToIds,
        dateFrom,
        dateTo,
      }}
    />
  );
}
