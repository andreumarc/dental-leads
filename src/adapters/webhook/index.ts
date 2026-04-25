import crypto from "crypto";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

// ─── DISPATCH ────────────────────────────────────────────────────────────────

/**
 * Dispatch a webhook POST to the given URL.
 * If a secret is provided, adds an HMAC-SHA256 signature header.
 * Returns true on 2xx, false otherwise. Never throws.
 */
export async function dispatchWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<boolean> {
  try {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "DentalLeads-Webhook/1.0",
      "X-DentalLeads-Event": payload.event,
      "X-DentalLeads-Timestamp": payload.timestamp,
    };

    if (secret) {
      const signature = computeSignature(body, secret);
      headers["X-DentalLeads-Signature"] = `sha256=${signature}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Webhook] Non-2xx response from ${url}: ${res.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[Webhook] Failed to dispatch to ${url}:`, (err as Error)?.message);
    return false;
  }
}

// ─── SIGNATURE ────────────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 signature for a webhook payload body.
 */
function computeSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/**
 * Verify the HMAC-SHA256 signature of an incoming webhook.
 * Compares the provided signature (stripped of "sha256=" prefix if present)
 * against the computed one using constant-time comparison.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const cleaned = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expected = computeSignature(payload, secret);

    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(cleaned, "hex");
    const b = Buffer.from(expected, "hex");

    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Build a standard webhook payload.
 */
export function buildWebhookPayload(
  event: string,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    event,
    data,
    timestamp: new Date().toISOString(),
  };
}
