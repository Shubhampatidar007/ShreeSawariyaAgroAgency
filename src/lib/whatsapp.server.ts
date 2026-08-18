const DEFAULT_API_VERSION = "v25.0";

type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
};

function getConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID?.trim();
  const recipientPhone = process.env.WHATSAPP_RECIPIENT_PHONE?.trim();

  if (!accessToken || !phoneNumberId || !recipientPhone) {
    const missing = [
      ...(!accessToken ? ["WHATSAPP_ACCESS_TOKEN"] : []),
      ...(!phoneNumberId ? ["WHATSAPP_BUSINESS_PHONE_NUMBER_ID"] : []),
      ...(!recipientPhone ? ["WHATSAPP_RECIPIENT_PHONE"] : []),
    ];
    throw new Error(`WhatsApp is not configured. Missing server variable(s): ${missing.join(", ")}.`);
  }

  return {
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION,
    phoneNumberId,
    accessToken,
    recipientPhone,
  };
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) throw new Error("WhatsApp recipient phone number is empty.");
  return digits;
}

function interpolateTemplate(message: string, recipient: { name: string; due: number; receiptId?: string }): string {
  return message
    .replaceAll("{name}", recipient.name)
    .replaceAll("{due}", `₹${recipient.due.toLocaleString("en-IN")}`)
    .replaceAll("{receipt}", recipient.receiptId || "");
}

export async function sendWhatsAppText(recipient: {
  name: string;
  due: number;
  receiptId?: string;
  message: string;
}) {
  const config = getConfig();
  const to = normalizePhoneNumber(config.recipientPhone);
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const bodyText = interpolateTemplate(recipient.message, recipient);

  if (!bodyText.trim()) {
    throw new Error("WhatsApp message text is empty.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number; error_data?: unknown } }
    | null;

  if (!response.ok) {
    const message = body?.error?.message || `Meta WhatsApp API returned HTTP ${response.status}.`;
    throw new Error(message);
  }

  return {
    messageId: body?.messages?.[0]?.id,
  };
}
