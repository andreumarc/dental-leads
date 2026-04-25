"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const schema = z.object({
  leadId: z.string().min(1, "Selecciona un lead"),
  clinicId: z.string().optional(),
  treatment: z.string().optional(),
  specialty: z.string().optional(),
  proposedAt: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum([
    "SOLICITADA", "PROPUESTA", "CONFIRMADA", "AGENDADA_EXTERNO",
    "CANCELADA", "REALIZADA", "NO_PRESENTADO",
  ] as const).default("SOLICITADA"),
});

type FormValues = z.infer<typeof schema>;

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Clinic { id: string; name: string }
interface Lead { id: string; firstName: string; lastName: string | null; phone: string | null }

interface AppointmentModalProps {
  clinics: Clinic[];
  leads: Lead[];
  defaultLeadId?: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-neutral-400";
const selectCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function AppointmentModal({ clinics, leads, defaultLeadId, children, onSuccess }: AppointmentModalProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leadId: defaultLeadId ?? "", status: "SOLICITADA" },
  });

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setServerError(null);

    // Convert proposedAt local datetime string to ISO
    const body: Record<string, unknown> = { ...data };
    if (data.proposedAt) {
      body.proposedAt = new Date(data.proposedAt).toISOString();
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) { setServerError(json.error ?? "Error al crear la cita"); return; }

      setOpen(false);
      reset();
      onSuccess?.();
      router.refresh();
    } catch {
      setServerError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  const COMMON_TREATMENTS = [
    "Ortodoncia", "Implantes", "Blanqueamiento", "Carillas",
    "Prótesis", "Periodoncia", "Endodoncia", "Revisión general", "Urgencia",
  ];

  const SPECIALTIES = [
    "Odontología general", "Ortodoncia", "Implantología", "Periodoncia",
    "Endodoncia", "Estética dental", "Pediatría", "Cirugía oral",
  ];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) { reset(); setServerError(null); }
      }}
    >
      <Dialog.Trigger asChild>
        {children ?? (
          <button className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Calendar className="w-4 h-4" />
            Nueva Cita
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">Nueva Cita</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {serverError}
              </div>
            )}

            {/* Lead select — only if defaultLeadId not fixed */}
            {!defaultLeadId && (
              <Field label="Lead" required error={errors.leadId?.message}>
                <select {...register("leadId")} className={selectCls}>
                  <option value="">Seleccionar lead…</option>
                  {leads.map((l) => {
                    const name = [l.firstName, l.lastName].filter(Boolean).join(" ");
                    return (
                      <option key={l.id} value={l.id}>
                        {name}{l.phone ? ` — ${l.phone}` : ""}
                      </option>
                    );
                  })}
                </select>
              </Field>
            )}

            {/* Clinic */}
            <Field label="Clínica" error={errors.clinicId?.message}>
              <select {...register("clinicId")} className={selectCls}>
                <option value="">Sin clínica</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {/* Treatment + Specialty */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tratamiento" error={errors.treatment?.message}>
                <select {...register("treatment")} className={selectCls}>
                  <option value="">Sin tratamiento</option>
                  {COMMON_TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Especialidad" error={errors.specialty?.message}>
                <select {...register("specialty")} className={selectCls}>
                  <option value="">Sin especialidad</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Proposed date/time */}
            <Field label="Fecha propuesta" error={errors.proposedAt?.message}>
              <input
                type="datetime-local"
                {...register("proposedAt")}
                className={inputCls}
              />
            </Field>

            {/* Status */}
            <Field label="Estado inicial" error={errors.status?.message}>
              <select {...register("status")} className={selectCls}>
                <option value="SOLICITADA">Solicitada</option>
                <option value="PROPUESTA">Propuesta</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="AGENDADA_EXTERNO">Agendada en sistema externo</option>
              </select>
            </Field>

            {/* Notes */}
            <Field label="Notas" error={errors.notes?.message}>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Observaciones sobre la cita…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 border border-neutral-200 text-neutral-700 text-sm font-medium py-2.5 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Cita
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
