const DEFAULT_API_VERSION = "v25.0";
const DEFAULT_TEMPLATE_NAME = "jaspers_market_order_confirmation_v1";
const DEFAULT_TEMPLATE_LANGUAGE = "en_US";

type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
};

export type WhatsAppTemplateRecipient = {
  mobile: string;
  customerName: string;
  orderId: string;
  orderDate: string;
};

function getConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_PHONE_NUMBER_ID on the server.");
  }

  return {
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION,
    phoneNumberId,
    accessToken,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || DEFAULT_TEMPLATE_NAME,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || DEFAULT_TEMPLATE_LANGUAGE,
  };
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) throw new Error("Recipient mobile number is empty.");
  return digits;
}

export async function sendWhatsAppOrderConfirmation(recipient: WhatsAppTemplateRecipient) {
  const config = getConfig();
  const to = normalizePhoneNumber(recipient.mobile);
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: recipient.customerName },
              { type: "text", text: recipient.orderId },
              { type: "text", text: recipient.orderDate },
            ],
          },
        ],
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
