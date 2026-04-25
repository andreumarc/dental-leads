import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso — Dental Leads",
  description: "Inicia sesión en tu cuenta de Dental Leads",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      {/* Logo / brand header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#0D9488] flex items-center justify-center shadow-md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-white"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1H9V5z"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#0F1F3C] tracking-tight">
            Dental{" "}
            <span className="text-[#0D9488]">Leads</span>
          </span>
        </div>
        <p className="text-sm text-neutral-500 font-medium tracking-wide uppercase">
          Ecosistema Impulsodent
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-neutral-400 text-center">
        © {new Date().getFullYear()} Impulsodent. Todos los derechos reservados.
      </p>
    </div>
  );
}
