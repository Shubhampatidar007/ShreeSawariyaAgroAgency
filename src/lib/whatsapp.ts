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
  const response = await fetch("/api/whatsapp/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as WhatsAppSendResponse | null;
  if (!response.ok || !data) {
    throw new Error(data?.note || "Unable to reach the WhatsApp messaging service.");
  }

  return data;
}
