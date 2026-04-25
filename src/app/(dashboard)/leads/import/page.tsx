"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FileUpload } from "@/components/ui/file-upload";

type ClinicLite = { id: string; name: string; slug: string };

type TargetField =
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "treatment"
  | "priority";

const TARGET_FIELDS: Array<{ key: TargetField; label: string; required?: boolean }> =
  [
    { key: "firstName", label: "Nombre", required: true },
    { key: "lastName", label: "Apellidos" },
    { key: "phone", label: "Teléfono" },
    { key: "email", label: "Email" },
    { key: "treatment", label: "Tratamiento" },
    { key: "priority", label: "Prioridad" },
  ];

function parseCsvPreview(text: string, maxRows = 5): {
  headers: string[];
  rows: string[][];
} {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    return values.map((v) => v.trim().replace(/^"|"$/g, ""));
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1, 1 + maxRows).map(parseLine);
  return { headers, rows };
}

function guessMapping(headers: string[]): Record<TargetField, string> {
  const norm = (s: string) => s.toLowerCase().trim();
  const find = (...candidates: string[]) => {
    const lower = headers.map(norm);
    for (const c of candidates) {
      const idx = lower.indexOf(c);
      if (idx >= 0) return headers[idx];
    }
    return "";
  };
  return {
    firstName: find("nombre", "name", "first_name", "firstname"),
    lastName: find("apellidos", "apellido", "last_name", "lastname"),
    phone: find("telefono", "teléfono", "phone", "mobile", "celular", "tel"),
    email: find("email", "correo", "mail"),
    treatment: find("tratamiento", "treatment", "servicio", "service"),
    priority: find("prioridad", "priority"),
  };
}

export default function LeadsImportPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<ClinicLite[]>([]);
  const [clinicId, setClinicId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{
    headers: string[];
    rows: string[][];
    allRows: string[][];
  } | null>(null);
  const [mapping, setMapping] = useState<Record<TargetField, string>>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    treatment: "",
    priority: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setClinics(
            data.data.map((c: { id: string; name: string; slug: string }) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
            }))
          );
          if (data.data.length > 0 && !clinicId) {
            setClinicId(data.data[0].id);
          }
        }
      })
      .catch(() => {
        setError("No se pudieron cargar las clínicas");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!file) {
      setParsed(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const preview = parseCsvPreview(text, 5);
      // Also parse all rows for submission
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      const allRows = lines.slice(1).map((line) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === "," && !inQuotes) {
            values.push(current);
            current = "";
          } else {
            current += ch;
          }
        }
        values.push(current);
        return values.map((v) => v.trim().replace(/^"|"$/g, ""));
      });
      setParsed({ headers: preview.headers, rows: preview.rows, allRows });
      setMapping(guessMapping(preview.headers));
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  }, [file]);

  const mappedPreview = useMemo(() => {
    if (!parsed) return [];
    const colIndex: Partial<Record<TargetField, number>> = {};
    for (const f of TARGET_FIELDS) {
      const col = mapping[f.key];
      const idx = col ? parsed.headers.indexOf(col) : -1;
      if (idx >= 0) colIndex[f.key] = idx;
    }
    return parsed.rows.map((row) => {
      const out: Record<TargetField, string> = {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        treatment: "",
        priority: "",
      };
      (Object.keys(colIndex) as TargetField[]).forEach((k) => {
        const idx = colIndex[k]!;
        out[k] = row[idx] ?? "";
      });
      return out;
    });
  }, [parsed, mapping]);

  const canImport =
    Boolean(file) &&
    Boolean(clinicId) &&
    Boolean(mapping.firstName) &&
    !submitting;

  const handleImport = async () => {
    if (!parsed || !clinicId) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    const colIndex: Partial<Record<TargetField, number>> = {};
    for (const f of TARGET_FIELDS) {
      const col = mapping[f.key];
      const idx = col ? parsed.headers.indexOf(col) : -1;
      if (idx >= 0) colIndex[f.key] = idx;
    }

    const rows = parsed.allRows
      .map((row) => {
        const out: Partial<Record<TargetField, string>> = {};
        (Object.keys(colIndex) as TargetField[]).forEach((k) => {
          const idx = colIndex[k]!;
          const v = (row[idx] ?? "").trim();
          if (v) out[k] = v;
        });
        return out;
      })
      .filter((r) => r.firstName);

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, clinicId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Error importando leads");
      }
      setResult({
        created: data.data.created,
        errors: data.data.errors ?? [],
        total: rows.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setResult(null);
    setError(null);
    setMapping({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      treatment: "",
      priority: "",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar leads"
        description="Sube un CSV y mapea las columnas para crear leads en masa."
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Importar" },
        ]}
      />

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">
          1. Selecciona la clínica destino
        </h2>
        <select
          value={clinicId}
          onChange={(e) => setClinicId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Selecciona una clínica...</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">
          2. Sube el archivo CSV
        </h2>
        <FileUpload accept=".csv,text/csv" onFile={setFile} />
      </div>

      {parsed && parsed.headers.length > 0 && (
        <>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-neutral-900">
              3. Mapea las columnas
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {TARGET_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {f.label}
                      {f.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">{f.key}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                  <select
                    value={mapping[f.key]}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">— No mapear —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-neutral-900">
              4. Vista previa (primeras 5 filas)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <tr>
                    {TARGET_FIELDS.map((f) => (
                      <th key={f.key} className="px-3 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {mappedPreview.map((row, i) => (
                    <tr key={i}>
                      {TARGET_FIELDS.map((f) => (
                        <td key={f.key} className="px-3 py-2 text-neutral-700">
                          {row[f.key] || (
                            <span className="text-neutral-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Error:</span>
            {error}
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-green-900">
                Importación completada
              </h3>
              <p className="mt-1 text-sm text-green-800">
                <strong>{result.created}</strong> leads creados de{" "}
                <strong>{result.total}</strong> filas.
                {result.errors.length > 0 && (
                  <>
                    {" "}
                    <strong>{result.errors.length}</strong> errores.
                  </>
                )}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-green-700 hover:text-green-800">
                    Ver detalles
                  </summary>
                  <ul className="mt-2 max-h-40 overflow-auto rounded-md bg-white p-3 text-xs text-neutral-700">
                    {result.errors.map((err, i) => (
                      <li key={i} className="py-0.5">
                        • {err}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="mt-4 flex gap-2">
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Ir a leads
                </Link>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Importar otro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push("/leads")}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!canImport}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
