"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/rbac";

type ClinicLite = { id: string; name: string; slug: string; city: string | null };

type UserWithAccess = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  clinicAccess: Array<{
    clinicId: string;
  }>;
};

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: UserWithAccess | null;
  clinics: ClinicLite[];
}

const baseSchema = z.object({
  name: z.string().min(2, "Introduce al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum([
    "SUPERADMIN",
    "ADMIN",
    "DIRECCION",
    "EMPLEADO",
    "GESTOR",
    "GESTOR",
    "GESTOR",
  ] as const),
  clinicIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof baseSchema>;

export function UserModal({
  open,
  onClose,
  onSaved,
  user,
  clinics,
}: UserModalProps) {
  const isEdit = Boolean(user);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "EMPLEADO" as UserRole,
      clinicIds: [],
      isActive: true,
      password: "",
    },
  });

  const selectedClinicIds = watch("clinicIds");

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setShowPassword(false);
    if (user) {
      reset({
        name:
          user.name?.trim() ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          "",
        email: user.email,
        role: user.role,
        clinicIds: user.clinicAccess.map((a) => a.clinicId),
        isActive: user.isActive,
        password: "",
      });
    } else {
      reset({
        name: "",
        email: "",
        role: "EMPLEADO" as UserRole,
        clinicIds: [],
        isActive: true,
        password: "",
      });
    }
  }, [open, user, reset]);

  const toggleClinic = (clinicId: string) => {
    const current = selectedClinicIds ?? [];
    if (current.includes(clinicId)) {
      setValue(
        "clinicIds",
        current.filter((id) => id !== clinicId),
        { shouldDirty: true }
      );
    } else {
      setValue("clinicIds", [...current, clinicId], { shouldDirty: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    // On create, password is required
    if (!isEdit && (!values.password || values.password.length < 8)) {
      setSubmitError("La contraseña es obligatoria (mínimo 8 caracteres)");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        role: values.role,
        clinicIds: values.clinicIds,
        isActive: values.isActive,
      };
      if (!isEdit) {
        payload.email = values.email;
      }
      if (values.password) {
        payload.password = values.password;
      }

      const url = isEdit ? `/api/users/${user!.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error guardando el usuario");
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
            {isEdit ? "Editar usuario" : "Invitar usuario"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Nombre completo
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="Ej. María García"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              disabled={isEdit}
              placeholder="persona@empresa.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-100 disabled:text-neutral-500"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
            {isEdit && (
              <p className="mt-1 text-xs text-neutral-500">
                El email no se puede modificar.
              </p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Rol
            </label>
            <select
              {...register("role")}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
            )}
          </div>

          {/* Clínicas */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Acceso a clínicas
            </label>
            {clinics.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-300 p-3 text-sm text-neutral-500">
                No hay clínicas disponibles. Crea una primero.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {clinics.map((c) => {
                  const checked = (selectedClinicIds ?? []).includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        checked
                          ? "border-teal-500 bg-teal-50"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClinic(c.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-neutral-900">
                          {c.name}
                        </div>
                        {c.city && (
                          <div className="truncate text-xs text-neutral-500">
                            {c.city}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Password (create only or optional change on edit) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder={isEdit ? "Dejar vacío para no cambiar" : "Mínimo 8 caracteres"}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 pr-10 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <input
              type="checkbox"
              {...register("isActive")}
              className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-neutral-900">
                Usuario activo
              </div>
              <div className="text-xs text-neutral-500">
                Los usuarios inactivos no pueden iniciar sesión.
              </div>
            </div>
          </label>

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
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
