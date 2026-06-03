// Thin wrapper around Meta's WhatsApp Business Cloud API.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Send a plain text WhatsApp message to a phone number (E.164, no "+").
 * Returns the WhatsApp message id on success.
 *
 * NOTE: outside the 24-hour customer service window you must send an
 * approved template instead of free-form text. This helper sends text.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<{ id: string | null; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  // Normalise: Cloud API expects digits only, no leading "+".
  const normalizedTo = to.replace(/[^\d]/g, "");

  if (!phoneNumberId || !token) {
    // Not configured yet — caller falls back to "saved locally only".
    return { id: null, error: "WhatsApp is not configured" };
  }

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
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
    const error = data?.error?.message || `WhatsApp API error (${res.status})`;
    return { id: null, error };
  }
  return { id: data?.messages?.[0]?.id ?? null };
}
