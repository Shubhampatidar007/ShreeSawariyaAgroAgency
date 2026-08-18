const DEFAULT_API_VERSION = "v25.0";
const DEMO_WHATSAPP_RECIPIENT = "919752469028";

type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
};

function getConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    const missing = [
      ...(!accessToken ? ["WHATSAPP_ACCESS_TOKEN"] : []),
      ...(!phoneNumberId ? ["WHATSAPP_BUSINESS_PHONE_NUMBER_ID"] : []),
    ];
    throw new Error(`WhatsApp is not configured. Missing server variable(s): ${missing.join(", ")}.`);
  }

  return {
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION,
    phoneNumberId,
    accessToken,
  };
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) throw new Error("WhatsApp recipient phone number is empty.");
  return digits;
}

function interpolateTemplate(message: string, recipient: { name: string; due: number }): string {
  return message
    .replaceAll("{name}", recipient.name)
    .replaceAll("{due}", `₹${recipient.due.toLocaleString("en-IN")}`);
}

export async function sendWhatsAppText(recipient: {
  name: string;
  due: number;
  mobile: string;
  message: string;
}) {
  const config = getConfig();
  // Demo/test mode always targets the one Meta-verified recipient.
  // The customer's stored mobile number is never used as the Meta destination.
  const to = normalizePhoneNumber(DEMO_WHATSAPP_RECIPIENT);
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const bodyText = interpolateTemplate(recipient.message, recipient);

  if (!bodyText.trim()) throw new Error("WhatsApp message text is empty.");

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
    | { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } }
    | null;

  if (!response.ok) {
    const metaMessage = body?.error?.message;
    const metaCode = body?.error?.code;
    throw new Error(
      metaMessage
        ? `Meta WhatsApp API error${metaCode ? ` (${metaCode})` : ""}: ${metaMessage}`
        : `Meta WhatsApp API returned HTTP ${response.status}.`,
    );
  }

  return {
    messageId: body?.messages?.[0]?.id,
  };
}
