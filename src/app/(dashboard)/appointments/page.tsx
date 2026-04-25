import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppointmentsClient } from "@/features/appointments/AppointmentsClient";
import type { AppointmentStatus, Prisma } from "@prisma/client";

interface AppointmentsPageProps {
  searchParams: Promise<{
    status?: string | string[];
    clinicId?: string | string[];
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId;
  if (!companyId) redirect("/login");

  const sp = await searchParams;
  const statuses = toArray(sp.status) as AppointmentStatus[];
  const clinicIds = toArray(sp.clinicId);
  const dateFrom = sp.dateFrom;
  const dateTo = sp.dateTo;
  const page = parseInt(sp.page ?? "1", 10);
  const pageSize = 20;

  const where: Prisma.AppointmentWhereInput = {
    lead: { companyId },
  };

  if (statuses.length > 0) where.status = { in: statuses };
  if (clinicIds.length > 0) where.clinicId = { in: clinicIds };
  if (dateFrom || dateTo) {
    where.proposedAt = {};
    if (dateFrom) where.proposedAt.gte = new Date(dateFrom);
    if (dateTo) where.proposedAt.lte = new Date(dateTo);
  }

  const skip = (page - 1) * pageSize;

  const [appointments, total, clinics, leads] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lead: {
          select: {
            id: true, firstName: true, lastName: true,
            phone: true, email: true, treatment: true, status: true,
          },
        },
        clinic: { select: { id: true, name: true, city: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.appointment.count({ where }),
    prisma.clinic.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <AppointmentsClient
      appointments={appointments as never}
      total={total}
      page={page}
      pageSize={pageSize}
      clinics={clinics}
      leads={leads}
      currentFilters={{ statuses, clinicIds, dateFrom, dateTo }}
    />
  );
}
