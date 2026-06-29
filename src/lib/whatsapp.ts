// Wrapper around Meta's WhatsApp Business Cloud API.
// Credentials can come from the database (configured in the UI) or env vars.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
import { prisma } from "./prisma";

export type WhatsAppConfig = {
  phoneNumberId?: string;
  accessToken?: string;
  verifyToken?: string;
  apiVersion?: string;
};

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const row = await prisma.integration.findUnique({ where: { provider: "whatsapp" } }).catch(() => null);
  const db = (row?.config as WhatsAppConfig) ?? {};
  return {
    phoneNumberId: db.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: db.accessToken || process.env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: db.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN,
    apiVersion: db.apiVersion || process.env.WHATSAPP_API_VERSION || "v21.0",
  };
}

export async function whatsappConfigured(): Promise<boolean> {
  const c = await getWhatsAppConfig();
  return Boolean(c.phoneNumberId && c.accessToken);
}

export async function getWhatsAppVerifyToken(): Promise<string | undefined> {
  return (await getWhatsAppConfig()).verifyToken;
}

/**
 * Send a plain text WhatsApp message to a phone number (E.164, no "+").
 * Returns the WhatsApp message id on success.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<{ id: string | null; error?: string }> {
  const { phoneNumberId, accessToken, apiVersion } = await getWhatsAppConfig();
  const normalizedTo = to.replace(/[^\d]/g, "");

  if (!phoneNumberId || !accessToken) {
    return { id: null, error: "WhatsApp is not configured" };
  }

  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTo,
      type: "text",
      text: { preview_url: false, body },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { id: null, error: data?.error?.message || `WhatsApp API error (${res.status})` };
  }
  return { id: data?.messages?.[0]?.id ?? null };
}
