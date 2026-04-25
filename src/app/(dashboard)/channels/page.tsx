import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChannelsClient } from "@/features/channels/ChannelsClient";

export default async function ChannelsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId;
  if (!companyId) redirect("/login");

  const channels = await prisma.channel.findMany({
    where: { companyId },
    include: {
      clinic: { select: { id: true, name: true, slug: true } },
      integrationAccount: {
        select: { id: true, provider: true, accountId: true, status: true, lastSyncAt: true },
      },
      _count: { select: { leads: true, conversations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const clinics = await prisma.clinic.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ChannelsClient channels={channels} clinics={clinics} />;
}
