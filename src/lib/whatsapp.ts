import { supabase } from "@/integrations/supabase/client";

export type WhatsAppMessageKind = "due-reminder" | "purchase-summary" | "custom";

export type WhatsAppRecipient = {
  id: string;
  name: string;
  mobile: string;
  due: number;
  village: string;
  lastPurchase: string;
};

export type WhatsAppSendRequest = {
  kind: WhatsAppMessageKind;
  recipients: WhatsAppRecipient[];
  message: string;
};

export type WhatsAppSendResponse = {
  ok: boolean;
  mode: "live";
  acceptedCount: number;
  skippedCount: number;
  messageId?: string;
  note?: string;
};

export async function sendWhatsAppBatch(
  payload: WhatsAppSendRequest,
): Promise<WhatsAppSendResponse> {
  const selectedRecipients = payload.recipients.filter((recipient) =>
    Boolean(recipient.id && recipient.name && recipient.mobile?.trim()),
  );

  if (selectedRecipients.length === 0) {
    return {
      ok: false,
      mode: "live",
      acceptedCount: 0,
      skippedCount: payload.recipients.length,
      note: "Select at least one customer with a valid mobile number.",
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch("/api/whatsapp/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...payload,
      recipients: selectedRecipients,
    }),
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
