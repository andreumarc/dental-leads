"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Introduce un email válido"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type AuthError = "credentials" | "inactive" | "unknown" | null;

const ERROR_MESSAGES: Record<NonNullable<AuthError>, string> = {
  credentials: "Email o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.",
  inactive:
    "Tu cuenta está desactivada. Contacta con el administrador de tu empresa.",
  unknown:
    "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        redirect: false,
      });

      if (!result) {
        setAuthError("unknown");
        return;
      }

      if (result.error) {
        // next-auth returns "CredentialsSignin" for wrong credentials
        if (
          result.error === "CredentialsSignin" ||
          result.error === "Configuration"
        ) {
          setAuthError("credentials");
        } else if (result.error.includes("inactive")) {
          setAuthError("inactive");
        } else {
          setAuthError("unknown");
        }
        return;
      }

      if (result.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setAuthError("unknown");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-900">
          Iniciar sesión
        </h1>
        <p className="text-sm text-neutral-500">
          Accede a tu panel de gestión de leads
        </p>
      </div>

      {/* Error banner */}
      {authError && (
        <div
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border text-sm",
            authError === "inactive"
              ? "bg-orange-50 border-orange-200 text-orange-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
          role="alert"
        >
          {authError === "inactive" ? (
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{ERROR_MESSAGES[authError]}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-neutral-700"
          >
            Email corporativo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="tu@clinica.com"
            {...register("email")}
            className={cn(
              "w-full h-10 px-3 rounded-lg border bg-white text-neutral-900 text-sm placeholder:text-neutral-400",
              "focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent",
              "transition-colors duration-150",
              errors.email
                ? "border-red-400 focus:ring-red-400"
                : "border-neutral-300"
            )}
          />
          {errors.email && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-neutral-700"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className={cn(
                "w-full h-10 px-3 pr-10 rounded-lg border bg-white text-neutral-900 text-sm placeholder:text-neutral-400",
                "focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent",
                "transition-colors duration-150",
                errors.password
                  ? "border-red-400 focus:ring-red-400"
                  : "border-neutral-300"
              )}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me + forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="sr-only peer"
              />
              <div
                className={cn(
                  "w-4 h-4 rounded border-2 border-neutral-300 bg-white",
                  "peer-checked:bg-[#0D9488] peer-checked:border-[#0D9488]",
                  "transition-colors duration-150 flex items-center justify-center"
                )}
              >
                <svg
                  className="w-2.5 h-2.5 text-white hidden peer-checked:block"
                  viewBox="0 0 10 8"
                  fill="none"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
              Recordarme
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-sm text-[#0D9488] hover:text-teal-700 font-medium transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full h-10 rounded-lg font-medium text-sm text-white",
            "bg-[#0D9488] hover:bg-teal-700 active:bg-teal-800",
            "focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:ring-offset-2",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-all duration-150",
            "flex items-center justify-center gap-2"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Iniciando sesión…
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="border-t border-neutral-100" />

      {/* Footer note */}
      <p className="text-center text-xs text-neutral-400">
        ¿Problemas para acceder?{" "}
        <a
          href="mailto:soporte@impulsodent.com"
          className="text-[#0D9488] hover:underline font-medium"
        >
          Contacta con soporte
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D9488]" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
