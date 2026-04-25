"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  Globe,
  Copy,
  Edit2,
  Eye,
  List,
  ToggleLeft,
  ToggleRight,
  Webhook,
} from "lucide-react";
import { FormBuilderModal } from "./FormBuilderModal";
import { FormSubmissionsModal } from "./FormSubmissionsModal";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface FormDef {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  webhookUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  clinic: { id: string; name: string; slug: string } | null;
  _count: { submissions: number };
}

interface Clinic {
  id: string;
  name: string;
}

interface FormsClientProps {
  forms: FormDef[];
  clinics: Clinic[];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function FormsClient({ forms, clinics }: FormsClientProps) {
  const router = useRouter();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDef | null>(null);
  const [submissionsForm, setSubmissionsForm] = useState<FormDef | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleToggleActive(form: FormDef) {
    setTogglingId(form.id);
    try {
      await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !form.isActive }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  function handleCopyWebhook(form: FormDef) {
    const url = form.webhookUrl ?? `${window.location.origin}/api/public/forms/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(form.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleCopyEmbed(form: FormDef) {
    const embedCode = `<script src="${window.location.origin}/embed/form.js" data-form="${form.slug}" async></script>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedId(`embed-${form.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col min-h-full bg-neutral-50">
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Formularios</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Crea y gestiona formularios web para capturar leads automáticamente
            </p>
          </div>
          <button
            onClick={() => {
              setEditingForm(null);
              setShowBuilder(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Formulario
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {forms.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <FileText className="w-10 h-10 text-neutral-300" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-neutral-900">No hay formularios todavía</h3>
              <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                Crea tu primer formulario web para empezar a capturar leads de forma automática desde tu web o landing page.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingForm(null);
                setShowBuilder(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primer formulario
            </button>
          </div>
        ) : (
          /* Forms grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white border border-neutral-200 rounded-xl shadow-sm p-5 flex flex-col gap-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{form.name}</p>
                      <p className="text-xs text-neutral-500 font-mono truncate">/{form.slug}</p>
                    </div>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(form)}
                    disabled={togglingId === form.id}
                    className="flex-shrink-0 text-neutral-400 hover:text-teal-600 transition-colors disabled:opacity-50"
                    title={form.isActive ? "Desactivar" : "Activar"}
                  >
                    {form.isActive ? (
                      <ToggleRight className="w-6 h-6 text-teal-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-neutral-500">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                      form.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {form.isActive ? "Activo" : "Inactivo"}
                  </span>
                  {form.clinic && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {form.clinic.name}
                    </span>
                  )}
                  <span className="ml-auto font-semibold text-neutral-700">
                    {form._count.submissions} envíos
                  </span>
                </div>

                {form.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2">{form.description}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap border-t border-neutral-100 pt-3 mt-auto">
                  <button
                    onClick={() => {
                      setEditingForm(form);
                      setShowBuilder(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>

                  <a
                    href={`/api/public/forms/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver embed
                  </a>

                  <button
                    onClick={() => handleCopyWebhook(form)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                      copiedId === form.id
                        ? "border-teal-300 text-teal-700 bg-teal-50"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <Webhook className="w-3.5 h-3.5" />
                    {copiedId === form.id ? "¡Copiado!" : "Copiar webhook"}
                  </button>

                  <button
                    onClick={() => setSubmissionsForm(form)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors ml-auto"
                  >
                    <List className="w-3.5 h-3.5" />
                    Ver envíos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showBuilder && (
        <FormBuilderModal
          form={editingForm}
          clinics={clinics}
          onClose={() => setShowBuilder(false)}
          onSaved={() => {
            setShowBuilder(false);
            router.refresh();
          }}
        />
      )}

      {submissionsForm && (
        <FormSubmissionsModal
          form={submissionsForm}
          onClose={() => setSubmissionsForm(null)}
        />
      )}
    </div>
  );
}
