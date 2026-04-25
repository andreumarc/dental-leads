"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AutomationRule } from "@prisma/client";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Clock,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationRuleModal } from "./AutomationRuleModal";
import { RULE_TEMPLATES } from "@/lib/automations/engine";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AutomationsClientProps {
  rules: AutomationRule[];
  users: Array<{ id: string; name: string | null; email: string; role: string }>;
  canManage: boolean;
}

export function AutomationsClient({
  rules,
  users,
  canManage,
}: AutomationsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [templateInitial, setTemplateInitial] = useState<
    (typeof RULE_TEMPLATES)[number] | null
  >(null);

  const handleToggle = async (rule: AutomationRule) => {
    await fetch(`/api/automations/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    router.refresh();
  };

  const handleDelete = async (rule: AutomationRule) => {
    if (!confirm(`¿Eliminar la regla "${rule.name}"?`)) return;
    await fetch(`/api/automations/${rule.id}`, { method: "DELETE" });
    router.refresh();
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setTemplateInitial(null);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingRule(null);
    setTemplateInitial(null);
    setModalOpen(true);
  };

  const handleTemplate = (template: (typeof RULE_TEMPLATES)[number]) => {
    setEditingRule(null);
    setTemplateInitial(template);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automatizaciones"
        description="Reglas automáticas para asignar, etiquetar y notificar leads."
        actions={
          canManage ? (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Nueva regla
            </button>
          ) : undefined
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Las automatizaciones se ejecutan tras cada evento de lead. Para volúmenes altos
          o trabajos programados, se recomienda migrar a un sistema de colas y workers
          (ej. BullMQ + Redis).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Reglas activas
          </h2>

          {rules.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="Sin reglas configuradas"
              description="Crea tu primera automatización o usa una plantilla lista."
              action={
                canManage
                  ? { label: "Nueva regla", onClick: handleNew }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Disparador</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                    <th className="px-4 py-3 font-medium">Última ejec.</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rules.map((rule) => {
                    const trigger = (rule.trigger as { type?: string } | null)
                      ?.type;
                    const actionCount = Array.isArray(rule.actions)
                      ? (rule.actions as unknown[]).length
                      : 0;
                    return (
                      <tr key={rule.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {rule.name}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                            <Zap className="h-3 w-3" />
                            {trigger ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {actionCount} acción{actionCount === 1 ? "" : "es"}
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {rule.lastRunAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(rule.lastRunAt, {
                                locale: es,
                                addSuffix: true,
                              })}
                            </span>
                          ) : (
                            "Nunca"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            disabled={!canManage}
                            onClick={() => handleToggle(rule)}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                              rule.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-200 text-neutral-600"
                            } disabled:opacity-50`}
                          >
                            {rule.isActive ? (
                              <>
                                <Play className="h-3 w-3" />
                                Activa
                              </>
                            ) : (
                              <>
                                <Pause className="h-3 w-3" />
                                Pausada
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(rule)}
                                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(rule)}
                                className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Plantillas
          </h2>
          <div className="space-y-3">
            {RULE_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-900">
                      {template.name}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      {template.description}
                    </p>
                    {canManage && (
                      <button
                        onClick={() => handleTemplate(template)}
                        className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        Usar plantilla →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AutomationRuleModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRule(null);
          setTemplateInitial(null);
        }}
        rule={editingRule}
        template={templateInitial}
        users={users}
        onSaved={() => {
          router.refresh();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
