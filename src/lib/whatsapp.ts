export type WhatsAppMessageKind = "due-reminder" | "receipt" | "custom";

export type WhatsAppRecipient = {
  id: string;
  name: string;
  mobile: string;
  due: number;
  village: string;
  lastPurchase: string;
  receiptId?: string;
};

export type WhatsAppSendRequest = {
  kind: WhatsAppMessageKind;
  recipients: WhatsAppRecipient[];
  message: string;
  receiptMode?: "latest" | "selected";
};

export type WhatsAppSendResponse = {
  ok: boolean;
  mode: "live";
  acceptedCount: number;
  skippedCount: number;
  messageId?: string;
  note?: string;
};

export async function sendWhatsAppBatch(payload: WhatsAppSendRequest): Promise<WhatsAppSendResponse> {
  const validRecipients = payload.recipients.filter(
    (recipient) => Boolean(recipient.id && recipient.name && recipient.mobile?.trim()),
  );

  if (validRecipients.length !== 1) {
    return {
      ok: false,
      mode: "live",
      acceptedCount: 0,
      skippedCount: payload.recipients.length,
      note: "Exactly one WhatsApp recipient must be selected for the current live setup.",
    };
  }

  const response = await fetch("/api/whatsapp/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, recipients: validRecipients }),
  });

  const result = (await response.json().catch(() => null)) as WhatsAppSendResponse | null;

  if (!result) {
    throw new Error(`WhatsApp service returned HTTP ${response.status}.`);
  }

  if (!response.ok) {
    throw new Error(result.note || `WhatsApp service returned HTTP ${response.status}.`);
  }

  return result;
}
