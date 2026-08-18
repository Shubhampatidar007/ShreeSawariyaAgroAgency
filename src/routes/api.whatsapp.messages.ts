import { createFileRoute } from "@tanstack/react-router";
import type { WhatsAppSendRequest } from "@/lib/whatsapp";
import { sendWhatsAppText } from "@/lib/whatsapp.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/whatsapp/messages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: WhatsAppSendRequest;

        try {
          payload = (await request.json()) as WhatsAppSendRequest;
        } catch {
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 0, note: "Invalid JSON payload." }, 400);
        }

        if (!payload || !payload.kind || !Array.isArray(payload.recipients) || !payload.message?.trim()) {
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 0, note: "Message type, one recipient and message text are required." }, 400);
        }

        const validRecipients = payload.recipients.filter(
          (recipient) => recipient.id && recipient.name && recipient.mobile?.trim(),
        );

        if (validRecipients.length !== 1) {
          return json({
            ok: false,
            mode: "live",
            acceptedCount: 0,
            skippedCount: payload.recipients.length,
            note: "The live WhatsApp setup currently allows exactly one recipient.",
          }, 400);
        }

        const recipient = validRecipients[0];

        try {
          const result = await sendWhatsAppText({
            name: recipient.name,
            due: recipient.due,
            receiptId: recipient.receiptId,
            message: payload.message,
          });

          return json({
            ok: true,
            mode: "live",
            acceptedCount: result.messageId ? 1 : 0,
            skippedCount: result.messageId ? 0 : 1,
            messageId: result.messageId,
            note: "WhatsApp message accepted by Meta Cloud API.",
          });
        } catch (error) {
          return json({
            ok: false,
            mode: "live",
            acceptedCount: 0,
            skippedCount: 1,
            note: error instanceof Error ? error.message : "WhatsApp delivery failed.",
          }, 502);
        }
      },
    },
  },
});
