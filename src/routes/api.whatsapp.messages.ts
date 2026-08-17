import { createFileRoute } from "@tanstack/react-router";
import type { WhatsAppSendRequest } from "@/lib/whatsapp";

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
          return json({ ok: false, mode: "demo", acceptedCount: 0, skippedCount: 0, note: "Invalid JSON payload." }, 400);
        }

        if (!payload || !payload.kind || !Array.isArray(payload.recipients) || !payload.message?.trim()) {
          return json({ ok: false, mode: "demo", acceptedCount: 0, skippedCount: 0, note: "Message type, recipients and message text are required." }, 400);
        }

        const validRecipients = payload.recipients.filter((recipient) => recipient.id && recipient.name && recipient.mobile);

        // Demo boundary: no Meta credentials are used yet. When the WhatsApp
        // Business Platform is connected, this handler becomes the single
        // server-side integration point for the Graph API request.
        return json({
          ok: true,
          mode: "demo",
          acceptedCount: validRecipients.length,
          skippedCount: payload.recipients.length - validRecipients.length,
          messageId: `demo_${Date.now()}`,
          note: "Demo mode is active. Recipients were validated, but no WhatsApp messages were delivered.",
        });
      },
    },
  },
});
