import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FormsClient } from "@/features/forms/FormsClient";

export default async function FormsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId ?? undefined;
  if (!companyId) redirect("/login");

  const forms = await prisma.formDefinition.findMany({
    where: { companyId },
    include: {
      clinic: { select: { id: true, name: true, slug: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const clinics = await prisma.clinic.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <FormsClient forms={forms} clinics={clinics} />;
}
