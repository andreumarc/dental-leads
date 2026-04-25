"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  createdAt: string | Date;
  data: Record<string, string | boolean | number>;
  leadId: string | null;
  lead?: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
}

interface FormDef {
  id: string;
  name: string;
  slug: string;
  _count: { submissions: number };
}

interface FormSubmissionsModalProps {
  form: FormDef;
  onClose: () => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function FormSubmissionsModal({ form, onClose }: FormSubmissionsModalProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/forms/${form.id}?submissions=1&page=${page}&pageSize=${pageSize}`
      );
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data.submissions ?? []);
        setTotal(data.data.submissionCount ?? form._count.submissions);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [form.id, form._count.submissions, page]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  function getDisplayName(data: Record<string, string | boolean | number>): string {
    const name =
      (data.nombre as string) ??
      (data.name as string) ??
      (data.firstName as string) ??
      "";
    const apellido = (data.apellido as string) ?? (data.apellidos as string) ?? "";
    return [name, apellido].filter(Boolean).join(" ") || "—";
  }

  function getPhone(data: Record<string, string | boolean | number>): string {
    return ((data.telefono as string) ?? (data.phone as string) ?? "—") as string;
  }

  function getEmail(data: Record<string, string | boolean | number>): string {
    return ((data.email as string) ?? "—") as string;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Envíos del formulario</h2>
            <p className="text-sm text-neutral-500">{form.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500 font-medium">
              {total} envío{total !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando envíos...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-neutral-400">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-2">
                <ExternalLink className="w-6 h-6 text-neutral-300" />
              </div>
              <p className="text-sm font-medium text-neutral-500">Sin envíos todavía</p>
              <p className="text-xs text-neutral-400">
                Los envíos aparecerán aquí cuando alguien complete el formulario.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-white border-b border-neutral-200 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Teléfono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Lead
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(submission.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-800 font-medium">
                      {submission.lead
                        ? `${submission.lead.firstName} ${submission.lead.lastName ?? ""}`.trim()
                        : getDisplayName(submission.data)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {getPhone(submission.data)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {getEmail(submission.data)}
                    </td>
                    <td className="px-4 py-3">
                      {submission.leadId ? (
                        <Link
                          href={`/leads/${submission.leadId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver lead
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Sin lead</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 flex-shrink-0 bg-neutral-50">
            <p className="text-sm text-neutral-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
