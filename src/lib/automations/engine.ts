import { prisma } from "@/lib/prisma";
import type { Lead, AutomationRule } from "@prisma/client";

/**
 * Automation trigger types — must match schema enum.
 */
export type AutomationTriggerType =
  | "LEAD_CREADO"
  | "LEAD_ACTUALIZADO"
  | "LEAD_SIN_RESPUESTA"
  | "CITA_CREADA"
  | "FORMULARIO_RECIBIDO";

export type AutomationActionType =
  | "ASIGNAR_A"
  | "CAMBIAR_ESTADO"
  | "AÑADIR_ETIQUETA"
  | "ENVIAR_ALERTA"
  | "NOTIFICAR_USUARIO";

export interface AutomationCondition {
  field: string; // e.g. "channel.type" | "treatment" | "priority"
  operator: "equals" | "contains" | "in" | "greater_than" | "less_than";
  value: string | string[] | number;
}

export interface AutomationAction {
  type: AutomationActionType;
  params: Record<string, unknown>;
}

export interface AutomationContext {
  userId?: string;
  companyId: string;
}

/**
 * Evaluates a single condition against a lead object.
 */
function evaluateCondition(
  condition: AutomationCondition,
  lead: Lead & Record<string, unknown>
): boolean {
  const rawValue = condition.field
    .split(".")
    .reduce<unknown>((obj, key) => {
      if (obj && typeof obj === "object" && key in obj) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, lead);

  if (rawValue === undefined || rawValue === null) return false;

  switch (condition.operator) {
    case "equals":
      return rawValue === condition.value;
    case "contains":
      return String(rawValue)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());
    case "in":
      return (
        Array.isArray(condition.value) &&
        condition.value.map(String).includes(String(rawValue))
      );
    case "greater_than":
      return Number(rawValue) > Number(condition.value);
    case "less_than":
      return Number(rawValue) < Number(condition.value);
    default:
      return false;
  }
}

/**
 * Executes a single action against a lead.
 * Always wrapped in try/catch — never throws.
 */
async function executeAction(
  action: AutomationAction,
  lead: Lead,
  context: AutomationContext
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case "ASIGNAR_A": {
        const userId = action.params.userId as string | undefined;
        if (!userId) return { success: false, error: "userId missing" };
        await prisma.lead.update({
          where: { id: lead.id },
          data: { assignedToId: userId, status: "ASIGNADO" },
        });
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            type: "ASIGNADO",
            description: `Asignación automática a usuario ${userId}`,
            metadata: { automation: true } as never,
          },
        });
        break;
      }

      case "CAMBIAR_ESTADO": {
        const status = action.params.status as string | undefined;
        if (!status) return { success: false, error: "status missing" };
        await prisma.lead.update({
          where: { id: lead.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { status: status as any },
        });
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            type: "ESTADO_CAMBIADO",
            description: `Estado cambiado automáticamente a ${status}`,
            metadata: { automation: true, newStatus: status } as never,
          },
        });
        break;
      }

      case "AÑADIR_ETIQUETA": {
        const tag = action.params.tag as string | undefined;
        if (!tag) return { success: false, error: "tag missing" };
        await prisma.leadTag.create({
          data: { leadId: lead.id, name: tag },
        });
        break;
      }

      case "ENVIAR_ALERTA":
      case "NOTIFICAR_USUARIO": {
        // Placeholder for email / push notification dispatch.
        // Log to audit for now.
        await prisma.auditLog.create({
          data: {
            companyId: context.companyId,
            userId: context.userId ?? null,
            action: "UPDATE",
            entity: "Lead",
            entityId: lead.id,
            changes: { alert: action.params } as import("@prisma/client").Prisma.InputJsonValue,
          },
        });
        break;
      }

      default:
        return { success: false, error: `Unknown action ${action.type}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Core automation runner.
 * Fetches active rules for trigger, evaluates conditions, executes actions.
 * Non-blocking: wrapped in try/catch, never throws.
 */
export async function runAutomations(
  trigger: AutomationTriggerType,
  lead: Lead,
  context: AutomationContext
): Promise<void> {
  try {
    const rules = await prisma.automationRule.findMany({
      where: {
        companyId: context.companyId,
        isActive: true,
      },
    });

    const matchingRules = rules.filter((rule: AutomationRule) => {
      const triggerData = rule.trigger as { type?: string } | null;
      return triggerData?.type === trigger;
    });

    for (const rule of matchingRules) {
      try {
        const conditions = (rule.conditions as unknown as AutomationCondition[]) ?? [];
        const allConditionsMet =
          conditions.length === 0 ||
          conditions.every((c) => evaluateCondition(c, lead as never));

        if (!allConditionsMet) continue;

        const actions = (rule.actions as unknown as AutomationAction[]) ?? [];
        for (const action of actions) {
          await executeAction(action, lead, context);
        }

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date() },
        });
      } catch (ruleError) {
        // eslint-disable-next-line no-console
        console.error(`[Automations] Rule ${rule.id} failed:`, ruleError);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Automations] Engine error:", error);
  }
}

/**
 * Pre-built rule templates for the UI "quick create" feature.
 */
export const RULE_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  trigger: { type: AutomationTriggerType };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}> = [
  {
    id: "auto-assign-whatsapp",
    name: "Autoasignación canal WhatsApp",
    description: "Asigna automáticamente leads de WhatsApp al equipo de call center.",
    trigger: { type: "LEAD_CREADO" },
    conditions: [{ field: "channel.type", operator: "equals", value: "WHATSAPP" }],
    actions: [{ type: "AÑADIR_ETIQUETA", params: { tag: "whatsapp-auto" } }],
  },
  {
    id: "alert-no-response",
    name: "Alerta sin respuesta +2h",
    description: "Envía alerta si un lead lleva más de 2 horas sin respuesta.",
    trigger: { type: "LEAD_SIN_RESPUESTA" },
    conditions: [{ field: "status", operator: "equals", value: "PENDIENTE_RESPUESTA" }],
    actions: [
      { type: "ENVIAR_ALERTA", params: { channel: "email", severity: "medium" } },
    ],
  },
  {
    id: "tag-implant",
    name: "Etiquetado implantología",
    description: "Etiqueta automáticamente leads de implantología con 'alta-prioridad'.",
    trigger: { type: "LEAD_CREADO" },
    conditions: [
      { field: "treatment", operator: "contains", value: "implantolog" },
    ],
    actions: [{ type: "AÑADIR_ETIQUETA", params: { tag: "alta-prioridad" } }],
  },
  {
    id: "followup-pending",
    name: "Seguimiento pendiente llamada",
    description: "Mueve a 'En seguimiento' si pendiente de llamada +24h.",
    trigger: { type: "LEAD_SIN_RESPUESTA" },
    conditions: [{ field: "status", operator: "equals", value: "PENDIENTE_LLAMADA" }],
    actions: [
      { type: "CAMBIAR_ESTADO", params: { status: "EN_SEGUIMIENTO" } },
    ],
  },
];
