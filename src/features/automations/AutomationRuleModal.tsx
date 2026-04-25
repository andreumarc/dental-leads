"use client";

import { useEffect, useState } from "react";
import type { AutomationRule } from "@prisma/client";
import { X, Plus, Trash2 } from "lucide-react";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationTriggerType,
  RULE_TEMPLATES,
} from "@/lib/automations/engine";

type Template = (typeof RULE_TEMPLATES)[number];

interface AutomationRuleModalProps {
  open: boolean;
  onClose: () => void;
  rule: AutomationRule | null;
  template: Template | null;
  users: Array<{ id: string; name: string | null; email: string; role: string }>;
  onSaved: () => void;
}

const TRIGGERS: AutomationTriggerType[] = [
  "LEAD_CREADO",
  "LEAD_ACTUALIZADO",
  "LEAD_SIN_RESPUESTA",
  "CITA_CREADA",
  "FORMULARIO_RECIBIDO",
];

const FIELDS = [
  "channel.type",
  "treatment",
  "priority",
  "status",
  "clinicId",
  "utmSource",
  "utmCampaign",
];

const OPERATORS = ["equals", "contains", "in", "greater_than", "less_than"];

const ACTION_TYPES: Array<AutomationAction["type"]> = [
  "ASIGNAR_A",
  "CAMBIAR_ESTADO",
  "AÑADIR_ETIQUETA",
  "ENVIAR_ALERTA",
  "NOTIFICAR_USUARIO",
];

export function AutomationRuleModal({
  open,
  onClose,
  rule,
  template,
  users,
  onSaved,
}: AutomationRuleModalProps) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTriggerType>("LEAD_CREADO");
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setName(rule.name);
      setTrigger(
        ((rule.trigger as { type?: string } | null)?.type ??
          "LEAD_CREADO") as AutomationTriggerType
      );
      setConditions((rule.conditions as unknown as AutomationCondition[]) ?? []);
      setActions((rule.actions as unknown as AutomationAction[]) ?? []);
      setIsActive(rule.isActive);
    } else if (template) {
      setName(template.name);
      setTrigger(template.trigger.type);
      setConditions(template.conditions);
      setActions(template.actions);
      setIsActive(true);
    } else {
      setName("");
      setTrigger("LEAD_CREADO");
      setConditions([]);
      setActions([]);
      setIsActive(true);
    }
    setError(null);
  }, [open, rule, template]);

  const submit = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (actions.length === 0) {
      setError("Debes añadir al menos una acción");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        trigger: { type: trigger },
        conditions,
        actions,
        isActive,
      };

      const url = rule ? `/api/automations/${rule.id}` : "/api/automations";
      const method = rule ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error guardando la regla");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {rule ? "Editar regla" : "Nueva regla de automatización"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Autoasignación WhatsApp"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Disparador
            </label>
            <select
              value={trigger}
              onChange={(e) =>
                setTrigger(e.target.value as AutomationTriggerType)
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">
                Condiciones
              </label>
              <button
                onClick={() =>
                  setConditions([
                    ...conditions,
                    { field: "treatment", operator: "contains", value: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                <Plus className="h-3 w-3" />
                Añadir
              </button>
            </div>
            {conditions.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Sin condiciones — se ejecutará siempre que se dispare.
              </p>
            ) : (
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2"
                  >
                    <select
                      value={c.field}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = { ...c, field: e.target.value };
                        setConditions(next);
                      }}
                      className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                    >
                      {FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.operator}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = {
                          ...c,
                          operator: e.target.value as AutomationCondition["operator"],
                        };
                        setConditions(next);
                      }}
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <input
                      value={String(c.value)}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = { ...c, value: e.target.value };
                        setConditions(next);
                      }}
                      placeholder="valor"
                      className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() =>
                        setConditions(conditions.filter((_, idx) => idx !== i))
                      }
                      className="rounded-md p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">
                Acciones
              </label>
              <button
                onClick={() =>
                  setActions([
                    ...actions,
                    { type: "AÑADIR_ETIQUETA", params: { tag: "" } },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                <Plus className="h-3 w-3" />
                Añadir
              </button>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-red-500">
                Se requiere al menos una acción.
              </p>
            ) : (
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={a.type}
                        onChange={(e) => {
                          const next = [...actions];
                          next[i] = {
                            type: e.target.value as AutomationAction["type"],
                            params: {},
                          };
                          setActions(next);
                        }}
                        className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                      >
                        {ACTION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          setActions(actions.filter((_, idx) => idx !== i))
                        }
                        className="rounded-md p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      {a.type === "ASIGNAR_A" && (
                        <select
                          value={String(a.params.userId ?? "")}
                          onChange={(e) => {
                            const next = [...actions];
                            next[i] = {
                              ...a,
                              params: { userId: e.target.value },
                            };
                            setActions(next);
                          }}
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                        >
                          <option value="">Selecciona usuario</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ?? u.email} · {u.role}
                            </option>
                          ))}
                        </select>
                      )}
                      {a.type === "CAMBIAR_ESTADO" && (
                        <input
                          value={String(a.params.status ?? "")}
                          onChange={(e) => {
                            const next = [...actions];
                            next[i] = {
                              ...a,
                              params: { status: e.target.value },
                            };
                            setActions(next);
                          }}
                          placeholder="Ej. EN_SEGUIMIENTO"
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                        />
                      )}
                      {a.type === "AÑADIR_ETIQUETA" && (
                        <input
                          value={String(a.params.tag ?? "")}
                          onChange={(e) => {
                            const next = [...actions];
                            next[i] = {
                              ...a,
                              params: { tag: e.target.value },
                            };
                            setActions(next);
                          }}
                          placeholder="Nombre de la etiqueta"
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                        />
                      )}
                      {(a.type === "ENVIAR_ALERTA" ||
                        a.type === "NOTIFICAR_USUARIO") && (
                        <input
                          value={String(a.params.message ?? "")}
                          onChange={(e) => {
                            const next = [...actions];
                            next[i] = {
                              ...a,
                              params: { message: e.target.value },
                            };
                            setActions(next);
                          }}
                          placeholder="Mensaje de alerta"
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
            />
            Activa
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-neutral-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? "Guardando..." : rule ? "Guardar cambios" : "Crear regla"}
          </button>
        </div>
      </div>
    </div>
  );
}
