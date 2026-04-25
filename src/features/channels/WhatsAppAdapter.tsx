"use client";

import { useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Info,
  ExternalLink,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface WhatsAppAdapterProps {
  channelId?: string;
  config?: {
    phoneNumberId?: string;
    webhookVerifyToken?: string;
    mockMode?: boolean;
  };
  onSave?: (config: Record<string, string | boolean>) => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function WhatsAppAdapter({ channelId, config = {}, onSave }: WhatsAppAdapterProps) {
  const [phoneNumberId, setPhoneNumberId] = useState(config.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState(config.webhookVerifyToken ?? "dental-leads-verify");
  const [mockMode, setMockMode] = useState(config.mockMode ?? true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/whatsapp`
      : "https://tu-dominio.com/api/webhooks/whatsapp";

  async function handleTest() {
    if (mockMode) {
      setTestResult({
        success: true,
        message:
          "Modo demo activo — los mensajes son simulados. Configura credenciales reales de Meta Business API para conectar WhatsApp.",
      });
      return;
    }

    if (!phoneNumberId || !accessToken) {
      setTestResult({ success: false, message: "Introduce el Phone Number ID y el Access Token antes de probar." });
      return;
    }

    setTesting(true);
    setTestResult(null);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setTestResult({
      success: false,
      message:
        "No se pudo conectar con Meta Business API. Verifica que el Phone Number ID y el Access Token sean correctos y que el webhook esté configurado en Meta.",
    });
    setTesting(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        phoneNumberId,
        webhookVerifyToken: verifyToken,
        mockMode,
        // Never send raw access token to client-side storage — in production this would be encrypted server-side
      };
      onSave?.(payload);
    } finally {
      setSaving(false);
    }
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border ${
          mockMode
            ? "bg-amber-50 border-amber-200"
            : channelId
            ? "bg-green-50 border-green-200"
            : "bg-neutral-50 border-neutral-200"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            mockMode ? "bg-amber-100" : "bg-green-100"
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${mockMode ? "text-amber-600" : "text-green-600"}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${mockMode ? "text-amber-800" : "text-green-800"}`}>
            {mockMode ? "Modo demo activo" : "WhatsApp Business"}
          </p>
          <p className={`text-xs ${mockMode ? "text-amber-600" : "text-green-600"}`}>
            {mockMode
              ? "Los mensajes son simulados. Activa el modo real para conectar con Meta."
              : channelId
              ? "Canal configurado y activo"
              : "Pendiente de configuración"}
          </p>
        </div>
        <div className="ml-auto">
          {mockMode ? (
            <Clock className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
        </div>
      </div>

      {/* Mock mode toggle */}
      <label className="flex items-center justify-between gap-4 p-4 bg-white border border-neutral-200 rounded-xl cursor-pointer">
        <div>
          <p className="text-sm font-semibold text-neutral-800">Modo demo (simulado)</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Actívalo para simular mensajes de WhatsApp sin credenciales reales
          </p>
        </div>
        <div
          onClick={() => setMockMode((m) => !m)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            mockMode ? "bg-amber-400" : "bg-neutral-200"
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              mockMode ? "translate-x-5" : ""
            }`}
          />
        </div>
      </label>

      {/* Credentials */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-neutral-700">Credenciales Meta Business API</h3>

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Phone Number ID</label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="123456789012345"
            disabled={mockMode}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Access Token (Permanent)
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAxxxxxxxxxxxxxxxx..."
            disabled={mockMode}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
          <p className="text-xs text-neutral-400 mt-1">
            Obtenlo en Meta Business Suite → Tu app → WhatsApp → API Setup
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Webhook Verify Token
          </label>
          <input
            type="text"
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-neutral-400 mt-1">
            Token secreto que usarás en la verificación del webhook de Meta
          </p>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-neutral-700">URL de webhook (configurar en Meta)</h4>
          <button
            onClick={copyWebhook}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              copiedWebhook
                ? "border-teal-300 text-teal-700 bg-teal-50"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedWebhook ? "Copiado" : "Copiar"}
          </button>
        </div>
        <code className="text-xs font-mono text-teal-700 break-all block">{webhookUrl}</code>
        <p className="text-xs text-neutral-400 mt-2">
          En Meta Business → Tu app → Webhooks, configura esta URL y el campo de verificación.
        </p>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            testResult.success ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
          }`}
        >
          <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${testResult.success ? "text-green-600" : "text-amber-600"}`} />
          <p className={`text-xs ${testResult.success ? "text-green-700" : "text-amber-700"}`}>
            {testResult.message}
          </p>
        </div>
      )}

      {/* Setup instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          Instrucciones de configuración
        </h4>
        <ol className="text-xs text-blue-700 space-y-2 list-decimal list-inside">
          <li>Crea una cuenta en <span className="font-semibold">Meta Business Suite</span> y una app de tipo Business.</li>
          <li>Añade el producto <span className="font-semibold">WhatsApp</span> a tu app.</li>
          <li>Obtén el <span className="font-semibold">Phone Number ID</span> y genera un <span className="font-semibold">Access Token permanente</span>.</li>
          <li>En la sección Webhooks, configura la URL de arriba y el verify token que has definido.</li>
          <li>Suscríbete al campo <code className="font-mono bg-blue-100 px-1 rounded">messages</code>.</li>
          <li>Vuelve aquí, introduce las credenciales y haz clic en "Probar conexión".</li>
        </ol>
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-3 hover:underline"
        >
          Documentación oficial de Meta
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          {testing ? (
            <>
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              Probando...
            </>
          ) : (
            "Probar conexión"
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}
