"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface StatusChangeModalProps {
  leadId: string;
  currentStatus: string;
  children: React.ReactNode;
  onSuccess?: () => void;
}

// ─── STATUSES ─────────────────────────────────────────────────────────────────

const STATUSES: { value: string; label: string; group: string }[] = [
  { value: "NUEVO", label: "Nuevo", group: "Inicial" },
  { value: "SIN_ASIGNAR", label: "Sin asignar", group: "Inicial" },
  { value: "ASIGNADO", label: "Asignado", group: "Gestión" },
  { value: "PENDIENTE_RESPUESTA", label: "Pendiente respuesta", group: "Gestión" },
  { value: "RESPONDIDO", label: "Respondido", group: "Gestión" },
  { value: "PENDIENTE_LLAMADA", label: "Pendiente llamada", group: "Gestión" },
  { value: "EN_SEGUIMIENTO", label: "En seguimiento", group: "Gestión" },
  { value: "CITA_SOLICITADA", label: "Cita solicitada", group: "Citas" },
  { value: "CITA_PROPUESTA", label: "Cita propuesta", group: "Citas" },
  { value: "CITA_CONFIRMADA", label: "Cita confirmada", group: "Citas" },
  { value: "NO_LOCALIZADO", label: "No localizado", group: "Cierre" },
  { value: "NO_INTERESADO", label: "No interesado", group: "Cierre" },
  { value: "DUPLICADO", label: "Duplicado", group: "Cierre" },
  { value: "SPAM", label: "Spam", group: "Cierre" },
  { value: "CONVERTIDO", label: "Convertido", group: "Cierre" },
  { value: "PERDIDO", label: "Perdido", group: "Cierre" },
];

const LOSS_REASONS = [
  "Precio elevado",
  "No responde",
  "Elige otra clínica",
  "Ya tiene tratamiento",
  "Cambio de idea",
  "Sin presupuesto",
  "Otro",
];

const selectCls =
  "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function StatusChangeModal({
  leadId,
  currentStatus,
  children,
  onSuccess,
}: StatusChangeModalProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [lossReason, setLossReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const needsLossReason = status === "PERDIDO" || status === "NO_INTERESADO";

  async function handleSubmit() {
    if (!status) return;
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { status };
      if (needsLossReason) {
        body.lossReason = lossReason === "Otro" ? customReason : lossReason;
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al cambiar el estado");
        return;
      }

      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // Group statuses
  const groups = Array.from(new Set(STATUSES.map((s) => s.group)));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) { setStatus(currentStatus); setError(null); setLossReason(""); setCustomReason(""); }
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Cambiar estado
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Status select grouped */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Nuevo estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectCls}
              >
                {groups.map((group) => (
                  <optgroup key={group} label={group}>
                    {STATUSES.filter((s) => s.group === group).map((s) => (
                      <option key={s.value} value={s.value} disabled={s.value === currentStatus}>
                        {s.label}{s.value === currentStatus ? " (actual)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Loss reason */}
            {needsLossReason && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-700">
                  Motivo de pérdida <span className="text-red-500">*</span>
                </label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Seleccionar motivo…</option>
                  {LOSS_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {lossReason === "Otro" && (
                  <input
                    type="text"
                    placeholder="Especificar motivo…"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-1 w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 border border-neutral-200 text-neutral-700 text-sm font-medium py-2.5 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  status === currentStatus ||
                  (needsLossReason && !lossReason) ||
                  (lossReason === "Otro" && !customReason)
                }
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Cambiar estado
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
