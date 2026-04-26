"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Globe,
  Webhook,
  UserPlus,
  FileSpreadsheet,
  Link2,
  MoreHorizontal,
  Trash2,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChannelCard } from "./ChannelCard";
import { WhatsAppAdapter } from "./WhatsAppAdapter";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  type: string;
  status: string;
  isActive: boolean;
  config?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  clinic?: { id: string; name: string; slug: string } | null;
  integrationAccount?: {
    id: string;
    provider: string;
    accountId: string | null;
    metadata?: Record<string, unknown> | null;
    updatedAt: Date | string;
  } | null;
  _count: { leads: number; conversations: number };
}

interface Clinic {
  id: string;
  name: string;
}

interface ChannelsClientProps {
  channels: Channel[];
  clinics: Clinic[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const CHANNEL_TYPE_INFO: Record<string, { label: string; description: string; icon: React.FC<{ className?: string }> }> = {
  WHATSAPP: {
    label: "WhatsApp",
    description: "Recibe y gestiona conversaciones de WhatsApp Business API. Requiere cuenta de Meta Business.",
    icon: MessageSquare,
  },
  FORM_WEB: {
    label: "Formulario Web",
    description: "Captura leads desde formularios embed en tu web o landing page.",
    icon: Globe,
  },
  WEBHOOK: {
    label: "Webhook",
    description: "Recibe leads desde sistemas externos a través de un endpoint HTTP seguro.",
    icon: Webhook,
  },
  MANUAL: {
    label: "Manual",
    description: "Registra leads creados manualmente por el equipo de recepción o callcenter.",
    icon: UserPlus,
  },
  CSV_IMPORT: {
    label: "Importación CSV",
    description: "Importa leads en lote desde archivos CSV o Excel.",
    icon: FileSpreadsheet,
  },
  GENERIC: {
    label: "Externo",
    description: "Integración genérica con plataformas de terceros o conectores personalizados.",
    icon: Link2,
  },
};

const STATUS_MAP: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  ACTIVO: { label: "Activo", icon: CheckCircle2, color: "text-green-600" },
  INACTIVO: { label: "Inactivo", icon: XCircle, color: "text-neutral-400" },
  PENDIENTE_CONFIG: { label: "Pendiente config.", icon: Clock, color: "text-amber-600" },
  ERROR: { label: "Error", icon: XCircle, color: "text-red-500" },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function ChannelsClient({ channels, clinics }: ChannelsClientProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [configChannel, setConfigChannel] = useState<Channel | null>(null);
  const [newChannelType, setNewChannelType] = useState<string>("WHATSAPP");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelClinicId, setNewChannelClinicId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleCreateChannel() {
    if (!newChannelName.trim()) {
      setCreateError("El nombre del canal es obligatorio");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName.trim(),
          type: newChannelType,
          clinicId: newChannelClinicId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Error al crear el canal");
        return;
      }
      setShowAddModal(false);
      setNewChannelName("");
      setNewChannelClinicId("");
      router.refresh();
    } catch {
      setCreateError("Error de red");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este canal? Esta acción desactivará el canal.")) return;
    await fetch(`/api/channels/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleToggle(channel: Channel) {
    await fetch(`/api/channels/${channel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !channel.isActive }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col min-h-full bg-neutral-50">
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Canales</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Gestiona los canales de captación de leads
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir Canal
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-8">
        {/* Channel types overview */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">Tipos de canal disponibles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CHANNEL_TYPE_INFO).map(([type, info]) => {
              const existing = channels.filter((c) => c.type === type);
              const activeOne = existing.find((c) => c.isActive);
              return (
                <ChannelCard
                  key={type}
                  type={type}
                  name={info.label}
                  description={info.description}
                  status={activeOne?.status}
                  leadsCount={existing.reduce((sum, c) => sum + c._count.leads, 0)}
                  onConfigure={() => {
                    setNewChannelType(type);
                    setShowAddModal(true);
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* Active channels table */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">
            Canales configurados{" "}
            <span className="text-neutral-400 font-normal">({channels.length})</span>
          </h2>

          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white border border-neutral-200 rounded-xl gap-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
                <Link2 className="w-6 h-6 text-neutral-300" />
              </div>
              <p className="text-sm font-medium text-neutral-500">No hay canales configurados todavía</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir primer canal
              </button>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Canal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Clínica</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Leads</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Última act.</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel) => {
                    const typeInfo = CHANNEL_TYPE_INFO[channel.type];
                    const statusInfo = STATUS_MAP[channel.status] ?? STATUS_MAP.PENDIENTE_CONFIG;
                    const StatusIcon = statusInfo.icon;
                    const TypeIcon = typeInfo?.icon ?? Link2;

                    return (
                      <tr key={channel.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <TypeIcon className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-800">{channel.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-neutral-500">{typeInfo?.label ?? channel.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{statusInfo.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">
                          {channel.clinic?.name ?? <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 font-medium">
                          {channel._count.leads}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(channel.updatedAt), { addSuffix: true, locale: es })}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                align="end"
                                className="z-50 min-w-[160px] bg-white border border-neutral-200 rounded-xl shadow-lg py-1 outline-none"
                              >
                                <DropdownMenu.Item
                                  onSelect={() => setConfigChannel(channel)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                                >
                                  <Settings className="w-4 h-4" />
                                  Configurar
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onSelect={() => handleToggle(channel)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer outline-none"
                                >
                                  {channel.isActive ? "Desactivar" : "Activar"}
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                                <DropdownMenu.Item
                                  onSelect={() => handleDelete(channel.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Add channel modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="text-lg font-bold text-neutral-900">Añadir canal</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de canal</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {Object.entries(CHANNEL_TYPE_INFO).map(([type, info]) => (
                    <option key={type} value={type}>{info.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Nombre del canal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Ej: WhatsApp Clínica Madrid"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Clínica asociada</label>
                <select
                  value={newChannelClinicId}
                  onChange={(e) => setNewChannelClinicId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todas las clínicas</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear canal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp config modal */}
      {configChannel && configChannel.type === "WHATSAPP" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-neutral-900">
                Configurar {configChannel.name}
              </h2>
              <button
                onClick={() => setConfigChannel(null)}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <WhatsAppAdapter
                channelId={configChannel.id}
                config={(configChannel.config as Record<string, string | boolean>) ?? {}}
                onSave={async (newConfig) => {
                  await fetch(`/api/channels/${configChannel.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ config: newConfig }),
                  });
                  setConfigChannel(null);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
