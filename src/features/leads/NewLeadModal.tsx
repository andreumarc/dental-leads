"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const schema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().optional(),
  phone: z.string().min(6, "El teléfono es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  treatment: z.string().optional(),
  channelId: z.string().optional(),
  clinicId: z.string().min(1, "La clínica es obligatoria"),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).default("MEDIA"),
  initialMessage: z.string().optional(),
  gdprConsent: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Clinic { id: string; name: string }
interface Channel { id: string; name: string; type: string }

interface NewLeadModalProps {
  clinics: Clinic[];
  channels: Channel[];
  children?: React.ReactNode;
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-neutral-400";
const selectCls =
  "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function NewLeadModal({ clinics, channels, children }: NewLeadModalProps) {
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
    defaultValues: { priority: "MEDIA", gdprConsent: false },
  });

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Error al crear el lead");
        return;
      }

      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setServerError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <Plus className="w-4 h-4" />
            Nuevo Lead
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Nuevo Lead
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {serverError}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" required error={errors.firstName?.message}>
                <input {...register("firstName")} placeholder="Juan" className={inputCls} />
              </Field>
              <Field label="Apellidos" error={errors.lastName?.message}>
                <input {...register("lastName")} placeholder="García López" className={inputCls} />
              </Field>
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono" required error={errors.phone?.message}>
                <input {...register("phone")} placeholder="+34 600 000 000" className={inputCls} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input {...register("email")} type="email" placeholder="juan@ejemplo.com" className={inputCls} />
              </Field>
            </div>

            {/* Treatment */}
            <Field label="Tratamiento" error={errors.treatment?.message}>
              <input {...register("treatment")} placeholder="Ortodoncia, Implantes…" className={inputCls} />
            </Field>

            {/* Clinic + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Clínica" required error={errors.clinicId?.message}>
                <select {...register("clinicId")} className={selectCls}>
                  <option value="">Seleccionar clínica</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridad" error={errors.priority?.message}>
                <select {...register("priority")} className={selectCls}>
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </Field>
            </div>

            {/* Channel */}
            {channels.length > 0 && (
              <Field label="Canal" error={errors.channelId?.message}>
                <select {...register("channelId")} className={selectCls}>
                  <option value="">Sin canal</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}

            {/* Initial message */}
            <Field label="Mensaje inicial" error={errors.initialMessage?.message}>
              <textarea
                {...register("initialMessage")}
                rows={3}
                placeholder="Mensaje inicial del paciente…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* GDPR */}
            <div className="flex items-start gap-2.5 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <input
                id="gdprConsent"
                type="checkbox"
                {...register("gdprConsent")}
                className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="gdprConsent" className="text-sm text-neutral-700 cursor-pointer leading-snug">
                El paciente ha dado su consentimiento RGPD para el tratamiento de datos personales con fines comerciales.
              </label>
            </div>
            {errors.gdprConsent && (
              <p className="text-xs text-red-500">{errors.gdprConsent.message}</p>
            )}

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
                Crear Lead
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
