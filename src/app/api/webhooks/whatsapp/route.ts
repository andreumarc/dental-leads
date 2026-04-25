import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppAdapter } from "@/adapters/whatsapp";

// ─── GET /api/webhooks/whatsapp ───────────────────────────────────────────────
// Meta webhook verification endpoint

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Find any active WhatsApp channel and check verify token
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "dental-leads-verify";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification failed", { mode, token });
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST /api/webhooks/whatsapp ─────────────────────────────────────────────
// Receives WhatsApp messages from Meta and creates/updates leads

export async function POST(req: NextRequest) {
  // Always return 200 immediately to Meta to avoid retries
  const rawBody = await req.text();

  setImmediate(async () => {
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        console.warn("[WhatsApp Webhook] Invalid JSON payload");
        return;
      }

      // Verify it's a whatsapp message event
      const p = payload as { object?: string; entry?: unknown[] };
      if (p?.object !== "whatsapp_business_account") {
        return;
      }

      // Find an active WhatsApp channel to get config
      const channel = await prisma.channel.findFirst({
        where: { type: "WHATSAPP", isActive: true },
        include: { integrationAccount: true },
      });

      const config: Record<string, string> = {};
      if (channel?.config && typeof channel.config === "object") {
        Object.assign(config, channel.config);
      }

      // Get adapter
      const adapter = getWhatsAppAdapter(config);

      let message;
      try {
        message = await adapter.receiveMessage(payload);
      } catch {
        // Not a message event (e.g. status update), skip silently
        return;
      }

      if (!message?.from) return;

      // Normalize phone number
      const phone = `+${message.from}`;

      // Find or create lead by phone number
      let lead = await prisma.lead.findFirst({
        where: {
          phone: { in: [phone, message.from, message.from.replace(/^\+/, "")] },
          companyId: channel?.clinic?.companyId ?? undefined,
        },
        include: { conversations: { where: { channelId: channel?.id ?? undefined }, take: 1 } },
      });

      // If we have no company, try finding any company with a WhatsApp channel
      if (!lead && channel) {
        const company = await prisma.channel.findFirst({
          where: { id: channel.id },
          select: { companyId: true },
        });

        if (company) {
          lead = await prisma.lead.findFirst({
            where: {
              phone: { in: [phone, message.from] },
              companyId: company.companyId,
            },
            include: { conversations: { take: 1 } },
          });

          if (!lead) {
            // Create new lead from WhatsApp contact
            lead = await prisma.lead.create({
              data: {
                companyId: company.companyId,
                clinicId: channel.clinicId ?? null,
                channelId: channel.id,
                firstName: phone, // Will be updated when we know the name
                phone,
                status: "NUEVO",
                priority: "MEDIA",
                source: "whatsapp",
                initialMessage: message.body,
              },
              include: { conversations: { take: 1 } },
            });

            await prisma.leadEvent.create({
              data: {
                leadId: lead.id,
                type: "CREADO",
                description: `Lead creado automáticamente desde WhatsApp (${phone})`,
              },
            });
          }
        }
      }

      if (!lead) {
        console.warn(`[WhatsApp Webhook] Could not find or create lead for ${phone}`);
        return;
      }

      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          leadId: lead.id,
          channelId: channel?.id ?? undefined,
          isOpen: true,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            channelId: channel?.id ?? null,
            isOpen: true,
          },
        });
      }

      // Create message record
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "inbound",
          content: message.body,
          contentType: message.type,
          externalId: message.messageId,
          sentAt: message.timestamp,
        },
      });

      // Create lead event
      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          type: "MENSAJE_WHATSAPP_RECIBIDO",
          description: `Mensaje WhatsApp recibido de ${phone}: "${message.body.slice(0, 100)}${message.body.length > 100 ? "..." : ""}"`,
          metadata: { messageId: message.messageId, from: message.from, type: message.type },
        },
      });

      // Update last interaction
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastInteractionAt: new Date() },
      });

      console.log(`[WhatsApp Webhook] Processed message from ${phone} → lead ${lead.id}`);
    } catch (error) {
      console.error("[WhatsApp Webhook] Processing error:", error);
    }
  });

  return new NextResponse("OK", { status: 200 });
}
