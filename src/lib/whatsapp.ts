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
  mode: "demo" | "live";
  acceptedCount: number;
  skippedCount: number;
  messageId?: string;
  note?: string;
};

export async function sendWhatsAppBatch(payload: WhatsAppSendRequest): Promise<WhatsAppSendResponse> {
  const validRecipients = payload.recipients.filter(
    (recipient) => Boolean(recipient.id && recipient.name && recipient.mobile?.trim()),
  );

  // Demo boundary only. Keep the public UI independent from server-route
  // availability until the live Meta integration is enabled.
  return {
    ok: true,
    mode: "demo",
    acceptedCount: validRecipients.length,
    skippedCount: payload.recipients.length - validRecipients.length,
    messageId: `demo_${Date.now()}`,
    note: "Demo mode is active. Recipients were validated locally, but no WhatsApp messages were delivered.",
  };
}
