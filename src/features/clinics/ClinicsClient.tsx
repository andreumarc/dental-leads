"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Clinic } from "@prisma/client";
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Users as UsersIcon,
  Sparkles,
  Edit3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ClinicModal } from "./ClinicModal";

type ClinicWithCount = Clinic & {
  _count: { leads: number; userAccess: number };
};

interface ClinicsClientProps {
  clinics: ClinicWithCount[];
  canManage: boolean;
}

export function ClinicsClient({ clinics, canManage }: ClinicsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicWithCount | null>(null);

  const handleNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (c: ClinicWithCount) => {
    setEditing(c);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clínicas"
        description="Gestiona las clínicas de tu empresa."
        actions={
          canManage ? (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Nueva clínica
            </button>
          ) : undefined
        }
      />

      {clinics.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin clínicas"
          description="Crea tu primera clínica para empezar a gestionar leads."
          action={
            canManage ? { label: "Nueva clínica", onClick: handleNew } : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clinics.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-neutral-900">
                    {c.name}
                  </h3>
                  {c.city && (
                    <p className="mt-0.5 truncate text-sm text-neutral-500">
                      {c.city}
                    </p>
                  )}
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-2 text-sm text-neutral-600">
                {c.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                    <a
                      href={`tel:${c.phone}`}
                      className="truncate hover:text-teal-600"
                    >
                      {c.phone}
                    </a>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                    <a
                      href={`mailto:${c.email}`}
                      className="truncate hover:text-teal-600"
                    >
                      {c.email}
                    </a>
                  </div>
                )}
              </div>

              <div className="my-4 h-px bg-neutral-100" />

              <div className="flex items-center justify-between text-xs text-neutral-500">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-teal-500" />
                    <span className="font-medium text-neutral-700">
                      {c._count.leads}
                    </span>{" "}
                    leads
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="h-3 w-3 text-blue-500" />
                    <span className="font-medium text-neutral-700">
                      {c._count.userAccess}
                    </span>{" "}
                    usuarios
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    c.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {c.isActive ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Activa
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" /> Inactiva
                    </>
                  )}
                </span>
              </div>

              {canManage && (
                <button
                  onClick={() => handleEdit(c)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-teal-500 hover:text-teal-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ClinicModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        clinic={editing}
        onSaved={() => {
          setModalOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}
