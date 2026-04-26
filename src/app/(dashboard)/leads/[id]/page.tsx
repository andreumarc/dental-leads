import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { LeadDetailClient } from "@/features/leads/LeadDetailClient";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId ?? undefined;
  if (!companyId) redirect("/login");

  const { id } = await params;

  const [lead, users] = await Promise.all([
    prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        clinic: true,
        assignedTo: {
          select: { id: true, name: true, email: true, firstName: true, lastName: true, avatar: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, firstName: true, lastName: true },
        },
        channelRef: true,
        campaign: true,
        tags: true,
        events: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, avatar: true } },
          },
        },
        appointments: {
          orderBy: { createdAt: "desc" },
          include: {
            clinic: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        },
        assignmentHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { events: true, notes: true, appointments: true, conversations: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, firstName: true, lastName: true, email: true, avatar: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lead) notFound();

  return <LeadDetailClient lead={lead as never} users={users} currentUserId={session.user.id} />;
}
