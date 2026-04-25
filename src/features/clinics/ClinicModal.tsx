"use client";

import { useEffect, useState } from "react";
import type { Clinic } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Introduce al menos 2 caracteres").max(120),
  slug: z
    .string()
    .min(2, "Slug mínimo 2 caracteres")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  province: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  workingHoursEnabled: z.boolean().default(true),
  defaultReception: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

interface ClinicModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  clinic?: Clinic | null;
}

export function ClinicModal({ open, onClose, onSaved, clinic }: ClinicModalProps) {
  const isEdit = Boolean(clinic);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      address: "",
      city: "",
      province: "",
      phone: "",
      email: "",
      website: "",
      isActive: true,
      workingHoursEnabled: true,
      defaultReception: false,
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setSlugEdited(false);
    if (clinic) {
      const cfg = (clinic.config as Record<string, unknown> | null) ?? {};
      reset({
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address ?? "",
        city: clinic.city ?? "",
        province: clinic.province ?? "",
        phone: clinic.phone ?? "",
        email: clinic.email ?? "",
        website: clinic.website ?? "",
        isActive: clinic.isActive,
        workingHoursEnabled:
          typeof cfg.workingHoursEnabled === "boolean"
            ? cfg.workingHoursEnabled
            : true,
        defaultReception:
          typeof cfg.defaultReception === "boolean"
            ? cfg.defaultReception
            : false,
      });
      setSlugEdited(true);
    } else {
      reset({
        name: "",
        slug: "",
        address: "",
        city: "",
        province: "",
        phone: "",
        email: "",
        website: "",
        isActive: true,
        workingHoursEnabled: true,
        defaultReception: false,
      });
    }
  }, [open, clinic, reset]);

  // Auto-slug from name while not manually edited
  useEffect(() => {
    if (!slugEdited && nameValue) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, slugEdited, setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const payload = {
        name: values.name,
        slug: values.slug,
        address: values.address || undefined,
        city: values.city || undefined,
        province: values.province || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        website: values.website || undefined,
        isActive: values.isActive,
        config: {
          workingHoursEnabled: values.workingHoursEnabled,
          defaultReception: values.defaultReception,
        },
      };

      const url = isEdit ? `/api/clinics/${clinic!.id}` : "/api/clinics";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error guardando la clínica");
      }
      onSaved();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error desconocido");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? "Editar clínica" : "Nueva clínica"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Nombre *
              </label>
              <input
                type="text"
                {...register("name")}
                placeholder="Ej. Clínica Dental Centro"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Slug *
              </label>
              <input
                type="text"
                {...register("slug")}
                onChange={(e) => {
                  setSlugEdited(true);
                  setValue("slug", e.target.value);
                }}
                placeholder="clinica-centro"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Dirección
            </label>
            <input
              type="text"
              {...register("address")}
              placeholder="Calle, número, piso..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Ciudad
              </label>
              <input
                type="text"
                {...register("city")}
                placeholder="Madrid"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Provincia
              </label>
              <input
                type="text"
                {...register("province")}
                placeholder="Madrid"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Teléfono
              </label>
              <input
                type="tel"
                {...register("phone")}
                placeholder="+34 912 34 56 78"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="contacto@clinica.com"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Web
            </label>
            <input
              type="url"
              {...register("website")}
              placeholder="https://..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors.website && (
              <p className="mt-1 text-xs text-red-600">
                {errors.website.message}
              </p>
            )}
          </div>

          {/* Config toggles */}
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Configuración
            </div>
            <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white">
              <input
                type="checkbox"
                {...register("workingHoursEnabled")}
                className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-900">
                  Horario laboral (9h–20h)
                </div>
                <div className="text-xs text-neutral-500">
                  Aplicar horario por defecto a esta clínica.
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white">
              <input
                type="checkbox"
                {...register("defaultReception")}
                className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-900">
                  Recepción por defecto
                </div>
                <div className="text-xs text-neutral-500">
                  Los leads entrantes sin clínica se asignarán aquí.
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white">
              <input
                type="checkbox"
                {...register("isActive")}
                className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-900">
                  Activa
                </div>
                <div className="text-xs text-neutral-500">
                  Las clínicas inactivas no aparecen en los formularios públicos.
                </div>
              </div>
            </label>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear clínica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
