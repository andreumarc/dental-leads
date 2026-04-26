"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface FormField {
  id?: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options?: string[];
  order: number;
}

interface FormDef {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  webhookUrl: string | null;
  clinicId?: string | null;
  clinic?: { id: string; name: string } | null;
}

interface Clinic {
  id: string;
  name: string;
}

interface FormBuilderModalProps {
  form: FormDef | null;
  clinics: Clinic[];
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "textarea", label: "Área de texto" },
  { value: "select", label: "Desplegable" },
  { value: "checkbox", label: "Casilla" },
  { value: "date", label: "Fecha" },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function FormBuilderModal({ form, clinics, onClose, onSaved }: FormBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "campos" | "embed">("general");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [embedCopied, setEmbedCopied] = useState(false);

  // General tab state
  const [name, setName] = useState(form?.name ?? "");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [clinicId, setClinicId] = useState(form?.clinic?.id ?? "");
  const [webhookUrl, setWebhookUrl] = useState(form?.webhookUrl ?? "");

  // Fields tab state
  const [fields, setFields] = useState<FormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Auto-generate slug from name
  useEffect(() => {
    if (!form) {
      setSlug(slugify(name));
    }
  }, [name, form]);

  // Load existing fields
  useEffect(() => {
    if (form?.id) {
      setLoadingFields(true);
      fetch(`/api/forms/${form.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data.fields) {
            setFields(
              data.data.fields.map((f: FormField & { options?: unknown }) => ({
                ...f,
                options: f.options ?? [],
              }))
            );
          }
        })
        .catch(() => {})
        .finally(() => setLoadingFields(false));
    } else {
      // Default fields for new form
      setFields([
        { name: "nombre", label: "Nombre", type: "text", required: true, placeholder: "Tu nombre", order: 0 },
        { name: "telefono", label: "Teléfono", type: "phone", required: true, placeholder: "+34 600 000 000", order: 1 },
        { name: "email", label: "Email", type: "email", required: false, placeholder: "tu@email.com", order: 2 },
      ]);
    }
  }, [form]);

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        name: `campo_${prev.length + 1}`,
        label: `Campo ${prev.length + 1}`,
        type: "text",
        required: false,
        placeholder: "",
        order: prev.length,
      },
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
  }

  function moveField(index: number, direction: "up" | "down") {
    setFields((prev) => {
      const next = [...prev];
      const swapIdx = direction === "up" ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }

  function updateField(index: number, key: keyof FormField, value: string | boolean | string[]) {
    setFields((prev) => {
      const next = [...prev];
      (next[index] as unknown as Record<string, unknown>)[key] = value;
      if (key === "label" && typeof value === "string") {
        next[index].name = slugify(value).replace(/-/g, "_");
      }
      return next;
    });
  }

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!slug.trim()) newErrors.slug = "El slug es obligatorio";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        clinicId: clinicId || null,
        webhookUrl: webhookUrl.trim() || null,
        fields: fields.map((f, i) => ({ ...f, order: i })),
      };

      const url = form ? `/api/forms/${form.id}` : "/api/forms";
      const method = form ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error ?? "Error al guardar" });
        return;
      }

      onSaved();
    } catch {
      setErrors({ general: "Error de red al guardar" });
    } finally {
      setSaving(false);
    }
  }

  const embedCode = `<!-- Formulario ${name || "DentalLeads"} -->
<div id="dl-form-${slug || "formulario"}"></div>
<script>
  window.DentalLeadsConfig = {
    formSlug: "${slug || "formulario"}",
    apiBase: "${typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com"}"
  };
</script>
<script src="${typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com"}/embed/form.js" async></script>`;

  const iframeCode = `<iframe
  src="${typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com"}/embed/form/${slug || "formulario"}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>`;

  function copyEmbed(code: string) {
    navigator.clipboard.writeText(code);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-neutral-900">
            {form ? "Editar formulario" : "Nuevo formulario"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 flex-shrink-0">
          {(["general", "campos", "embed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab === "general" ? "General" : tab === "campos" ? "Campos" : "Embed"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errors.general}
            </div>
          )}

          {/* ── GENERAL TAB ── */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Nombre del formulario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Formulario implantes"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.name ? "border-red-400" : "border-neutral-200"
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Slug (URL pública) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                  <span className="px-3 py-2 bg-neutral-50 text-neutral-400 text-sm border-r border-neutral-200 flex-shrink-0">
                    /forms/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="formulario-implantes"
                    className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descripción interna del formulario..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Clínica</label>
                <select
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todas las clínicas</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  URL webhook (notificación externa)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://tu-crm.com/webhook/leads"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  Si se configura, los envíos de este formulario se notificarán a esta URL via POST.
                </p>
              </div>
            </div>
          )}

          {/* ── CAMPOS TAB ── */}
          {activeTab === "campos" && (
            <div className="flex flex-col gap-3">
              {loadingFields ? (
                <div className="flex items-center justify-center py-8 text-neutral-400 text-sm">
                  Cargando campos...
                </div>
              ) : (
                <>
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 bg-neutral-50"
                    >
                      {/* Field header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                          Campo {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveField(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-neutral-200 text-neutral-400 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveField(index, "down")}
                            disabled={index === fields.length - 1}
                            className="p-1 rounded hover:bg-neutral-200 text-neutral-400 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeField(index)}
                            className="p-1 rounded hover:bg-red-100 text-neutral-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Etiqueta
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField(index, "label", e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Clave (name)
                          </label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateField(index, "name", e.target.value.replace(/\s/g, "_").toLowerCase())}
                            className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Tipo
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, "type", e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={field.placeholder}
                            onChange={(e) => updateField(index, "placeholder", e.target.value)}
                            placeholder="Texto de ayuda..."
                            className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                        </div>
                      </div>

                      {/* Select options */}
                      {field.type === "select" && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Opciones (una por línea)
                          </label>
                          <textarea
                            value={(field.options ?? []).join("\n")}
                            onChange={(e) =>
                              updateField(index, "options", e.target.value.split("\n").filter(Boolean))
                            }
                            rows={4}
                            placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                            className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white resize-none"
                          />
                        </div>
                      )}

                      {/* Required toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          onClick={() => updateField(index, "required", !field.required)}
                          className={`relative w-9 h-5 rounded-full transition-colors ${
                            field.required ? "bg-teal-600" : "bg-neutral-200"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              field.required ? "translate-x-4" : ""
                            }`}
                          />
                        </div>
                        <span className="text-xs font-medium text-neutral-600">Campo obligatorio</span>
                      </label>
                    </div>
                  ))}

                  <button
                    onClick={addField}
                    className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-200 rounded-xl text-sm font-medium text-neutral-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir campo
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── EMBED TAB ── */}
          {activeTab === "embed" && (
            <div className="flex flex-col gap-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                Copia uno de los siguientes fragmentos de código e insértalo en tu web o landing page para mostrar el formulario.
              </div>

              {/* Script embed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-neutral-700">Embed con script (recomendado)</h3>
                  <button
                    onClick={() => copyEmbed(embedCode)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      embedCopied
                        ? "border-teal-300 text-teal-700 bg-teal-50"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {embedCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {embedCopied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
                <pre className="bg-neutral-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {embedCode}
                </pre>
              </div>

              {/* iFrame embed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-neutral-700">Embed via iFrame</h3>
                  <button
                    onClick={() => copyEmbed(iframeCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                </div>
                <pre className="bg-neutral-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {iframeCode}
                </pre>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">URL directa del endpoint</h4>
                <code className="text-xs font-mono text-neutral-600 bg-white border border-neutral-200 rounded-lg px-3 py-2 block break-all">
                  POST {typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com"}/api/public/forms/{slug || "tu-slug"}
                </code>
                <p className="text-xs text-neutral-500 mt-2">
                  Envía un POST con JSON o multipart/form-data. Los campos deben coincidir con los nombres (keys) definidos en el formulario.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 flex-shrink-0 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : form ? "Guardar cambios" : "Crear formulario"}
          </button>
        </div>
      </div>
    </div>
  );
}
