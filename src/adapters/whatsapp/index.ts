// ─── WHATSAPP ADAPTER CONTRACT ───────────────────────────────────────────────

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  messageId: string;
  type: "text" | "image" | "document" | "audio";
  mediaUrl?: string;
}

export interface WhatsAppAdapter {
  sendMessage(to: string, body: string): Promise<{ messageId: string }>;
  receiveMessage(payload: unknown): Promise<WhatsAppMessage>;
  getStatus(): Promise<{ connected: boolean; phoneNumber: string }>;
}

// ─── META (REAL) ADAPTER ─────────────────────────────────────────────────────

export class MetaWhatsAppAdapter implements WhatsAppAdapter {
  private phoneNumberId: string;
  private accessToken: string;

  constructor(config: { phoneNumberId: string; accessToken: string }) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
  }

  async sendMessage(to: string, body: string): Promise<{ messageId: string }> {
    const normalizedTo = to.replace(/[^0-9]/g, "");

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedTo,
          type: "text",
          text: { body },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Meta API error ${res.status}: ${(err as { error?: { message?: string } })?.error?.message ?? "Unknown error"}`
      );
    }

    const data = (await res.json()) as { messages?: Array<{ id: string }> };
    const messageId = data.messages?.[0]?.id ?? `meta-${Date.now()}`;
    return { messageId };
  }

  async receiveMessage(payload: unknown): Promise<WhatsAppMessage> {
    // Meta webhook payload parsing
    const p = payload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            metadata?: { phone_number_id?: string };
            contacts?: Array<{ wa_id?: string }>;
            messages?: Array<{
              id?: string;
              from?: string;
              timestamp?: string;
              type?: string;
              text?: { body?: string };
              image?: { id?: string; mime_type?: string };
              document?: { id?: string; filename?: string };
              audio?: { id?: string };
            }>;
          };
        }>;
      }>;
    };

    const change = p?.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    const to = change?.metadata?.phone_number_id ?? "";

    if (!msg) {
      throw new Error("Invalid WhatsApp webhook payload — no message found");
    }

    const type = (msg.type as WhatsAppMessage["type"]) ?? "text";
    let body = msg.text?.body ?? "";
    let mediaUrl: string | undefined;

    if (type === "image" && msg.image?.id) {
      mediaUrl = `https://graph.facebook.com/v19.0/${msg.image.id}`;
      body = "[Imagen]";
    } else if (type === "document" && msg.document?.id) {
      mediaUrl = `https://graph.facebook.com/v19.0/${msg.document.id}`;
      body = `[Documento: ${msg.document.filename ?? "archivo"}]`;
    } else if (type === "audio" && msg.audio?.id) {
      mediaUrl = `https://graph.facebook.com/v19.0/${msg.audio.id}`;
      body = "[Audio]";
    }

    return {
      from: msg.from ?? "",
      to,
      body,
      timestamp: new Date(parseInt(msg.timestamp ?? "0", 10) * 1000),
      messageId: msg.id ?? `incoming-${Date.now()}`,
      type,
      mediaUrl,
    };
  }

  async getStatus(): Promise<{ connected: boolean; phoneNumber: string }> {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${this.phoneNumberId}?fields=display_phone_number,verified_name`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) return { connected: false, phoneNumber: "" };

      const data = (await res.json()) as { display_phone_number?: string };
      return { connected: true, phoneNumber: data.display_phone_number ?? "" };
    } catch {
      return { connected: false, phoneNumber: "" };
    }
  }
}

// ─── MOCK ADAPTER ─────────────────────────────────────────────────────────────

export class MockWhatsAppAdapter implements WhatsAppAdapter {
  private mockPhone: string;

  constructor(config?: { mockPhone?: string }) {
    this.mockPhone = config?.mockPhone ?? "+34 600 000 000 (mock)";
  }

  async sendMessage(to: string, body: string): Promise<{ messageId: string }> {
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[MockWhatsApp] SEND → ${to}: "${body}" (messageId: ${messageId})`);
    return { messageId };
  }

  async receiveMessage(payload: unknown): Promise<WhatsAppMessage> {
    console.log("[MockWhatsApp] RECEIVE payload:", JSON.stringify(payload, null, 2));
    // Return a mock message
    return {
      from: "34600000001",
      to: "34600000000",
      body: "Hola, me gustaría información sobre implantes dentales.",
      timestamp: new Date(),
      messageId: `mock-recv-${Date.now()}`,
      type: "text",
    };
  }

  async getStatus(): Promise<{ connected: boolean; phoneNumber: string }> {
    return { connected: true, phoneNumber: this.mockPhone };
  }
}

// ─── FACTORY ─────────────────────────────────────────────────────────────────

export function getWhatsAppAdapter(config: Record<string, string>): WhatsAppAdapter {
  const isMockMode =
    config.mockMode === "true" ||
    !config.phoneNumberId ||
    !config.accessToken ||
    process.env.NODE_ENV === "development";

  if (isMockMode) {
    console.log("[WhatsApp] Using MockWhatsAppAdapter (mock mode)");
    return new MockWhatsAppAdapter();
  }

  console.log("[WhatsApp] Using MetaWhatsAppAdapter (production)");
  return new MetaWhatsAppAdapter({
    phoneNumberId: config.phoneNumberId,
    accessToken: config.accessToken,
  });
}
