import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/features/dashboard/DashboardClient";
import type { DashboardStats } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Force dynamic to always have fresh stats
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId ?? undefined;
  const now = new Date();

  // Time ranges
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());

  // Base where clause (company-scoped)
  const baseWhere = companyId ? { companyId } : {};

  // Run all queries in parallel
  const [
    totalLeads,
    leadsThisMonth,
    leadsLastMonth,
    nuevoStatusLeads,
    pendingLeads,
    convertedLeads,
    lostLeads,
    appointmentsThisWeek,
    appointmentsConfirmed,
    appointmentsPending,
    leadsPerStatusRaw,
    leadsPerChannelRaw,
    topTreatmentsRaw,
    leadsPerAgentRaw,
    recentLeads,
    leadsTrendRaw,
  ] = await Promise.all([
    // Total leads
    prisma.lead.count({ where: baseWhere }),

    // This month
    prisma.lead.count({
      where: { ...baseWhere, createdAt: { gte: thisMonthStart } },
    }),

    // Last month
    prisma.lead.count({
      where: {
        ...baseWhere,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),

    // New leads (NUEVO status)
    prisma.lead.count({ where: { ...baseWhere, status: "NUEVO" } }),

    // Pending (PENDIENTE_RESPUESTA + PENDIENTE_LLAMADA)
    prisma.lead.count({
      where: {
        ...baseWhere,
        status: { in: ["PENDIENTE_RESPUESTA", "PENDIENTE_LLAMADA"] },
      },
    }),

    // Converted
    prisma.lead.count({ where: { ...baseWhere, status: "CONVERTIDO" } }),

    // Lost
    prisma.lead.count({ where: { ...baseWhere, status: "PERDIDO" } }),

    // Appointments this week
    prisma.appointment.count({
      where: {
        ...(companyId ? { lead: { companyId } } : {}),
        createdAt: { gte: thisWeekStart },
      },
    }),

    // Appointments confirmed
    prisma.appointment.count({
      where: {
        ...(companyId ? { lead: { companyId } } : {}),
        status: "CONFIRMADA",
      },
    }),

    // Appointments pending
    prisma.appointment.count({
      where: {
        ...(companyId ? { lead: { companyId } } : {}),
        status: "SOLICITADA",
      },
    }),

    // Leads per status
    prisma.lead.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { status: true },
    }),

    // Leads per channel (via channelRef relation)
    prisma.lead.groupBy({
      by: ["channelId"],
      where: { ...baseWhere, channelId: { not: null } },
      _count: { channelId: true },
    }),

    // Top treatments
    prisma.lead.groupBy({
      by: ["treatment"],
      where: { ...baseWhere, treatment: { not: null } },
      _count: { treatment: true },
      orderBy: { _count: { treatment: "desc" } },
      take: 8,
    }),

    // Leads per agent
    prisma.lead.groupBy({
      by: ["assignedToId"],
      where: { ...baseWhere, assignedToId: { not: null } },
      _count: { assignedToId: true },
      orderBy: { _count: { assignedToId: "desc" } },
      take: 5,
    }),

    // Recent leads (last 10) with minimal relations
    prisma.lead.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        treatment: true,
        status: true,
        priority: true,
        createdAt: true,
        lastInteractionAt: true,
        clinic: { select: { id: true, name: true, slug: true, city: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    }),

    // Trend: last 30 days — using groupBy on createdAt approximation
    // We fetch leads from last 30 days and process in memory
    prisma.lead.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Fetch channel details for the groupBy result
  const channelIds = leadsPerChannelRaw
    .map((r) => r.channelId)
    .filter(Boolean) as string[];

  const channels = channelIds.length
    ? await prisma.channel.findMany({
        where: { id: { in: channelIds } },
        select: { id: true, name: true, type: true },
      })
    : [];

  // Fetch agent details
  const agentIds = leadsPerAgentRaw
    .map((r) => r.assignedToId)
    .filter(Boolean) as string[];

  const agents = agentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  // Compute conversion rate
  const conversionRate =
    totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 10000) / 100
      : 0;

  // Compute growth
  const leadsGrowthPercent =
    leadsLastMonth > 0
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
      : leadsThisMonth > 0
        ? 100
        : 0;

  // Build leadsPerStatus
  const leadsPerStatus = leadsPerStatusRaw.map((r) => ({
    status: r.status,
    count: r._count.status,
    percentage:
      totalLeads > 0
        ? Math.round((r._count.status / totalLeads) * 100)
        : 0,
  }));

  // Build leadsPerChannel
  const leadsPerChannel = leadsPerChannelRaw.map((r) => {
    const ch = channels.find((c) => c.id === r.channelId);
    const count = r._count.channelId;
    return {
      channel: ch?.name ?? "Desconocido",
      channelType: ch?.type ?? "GENERIC",
      count,
      percentage:
        totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    };
  });

  // Build topTreatments
  const topTreatments = topTreatmentsRaw.map((r) => ({
    treatment: r.treatment ?? "Sin tratamiento",
    count: r._count.treatment,
    percentage:
      totalLeads > 0
        ? Math.round((r._count.treatment / totalLeads) * 100)
        : 0,
  }));

  // Build leadsPerAgent
  const leadsPerAgent = leadsPerAgentRaw.map((r) => {
    const agent = agents.find((a) => a.id === r.assignedToId);
    return {
      userId: r.assignedToId ?? "",
      userName: agent?.name ?? agent?.email ?? "Desconocido",
      assigned: r._count.assignedToId,
      converted: 0, // Would need a subquery — set to 0 for now
      conversionRate: 0,
    };
  });

  // Build trend from raw lead records grouped by day
  const trendByDay = new Map<string, { count: number; converted: number }>();
  for (const lead of leadsTrendRaw as { createdAt: Date; status: string }[]) {
    const dayKey = lead.createdAt.toISOString().slice(0, 10);
    const existing = trendByDay.get(dayKey) ?? { count: 0, converted: 0 };
    existing.count += 1;
    if (lead.status === "CONVERTIDO") existing.converted += 1;
    trendByDay.set(dayKey, existing);
  }
  const leadsTrend = Array.from(trendByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { count, converted }]) => ({ date, count, converted }));

  // Leads created today
  const newLeadsToday = await prisma.lead.count({
    where: { ...baseWhere, createdAt: { gte: todayStart } },
  });

  // nuevoStatusLeads is the count of leads in NUEVO status (used for sidebar badge)
  void nuevoStatusLeads;

  const stats: DashboardStats = {
    totalLeads,
    leadsThisMonth,
    leadsLastMonth,
    leadsGrowthPercent,
    newLeads: newLeadsToday,
    pendingLeads,
    convertedLeads,
    lostLeads,
    conversionRate,
    avgResponseTimeMinutes: 0, // Would require event analysis
    appointmentsThisWeek,
    appointmentsConfirmed,
    appointmentsPending,
    leadsPerChannel,
    leadsPerStatus,
    leadsPerClinic: [], // Requires additional query
    leadsPerAgent,
    leadsTrend,
    topTreatments,
  };

  return (
    <DashboardClient
      stats={stats}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentLeads={recentLeads as any}
    />
  );
}
