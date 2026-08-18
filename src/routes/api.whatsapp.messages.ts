import { createFileRoute } from "@tanstack/react-router";
import type { WhatsAppSendRequest } from "@/lib/whatsapp";
import { sendWhatsAppText } from "@/lib/whatsapp.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/whatsapp/messages")({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: {
      POST: async ({ request }) => {
        let payload: WhatsAppSendRequest;
        try {
          payload = (await request.json()) as WhatsAppSendRequest;
        } catch {
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 0, note: "Invalid JSON payload." }, 400);
        }

        if (!payload || !payload.kind || !Array.isArray(payload.recipients) || !payload.message?.trim()) {
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 0, note: "Message type, recipient and message text are required." }, 400);
        }

        const validRecipients = payload.recipients.filter((recipient) => recipient.id && recipient.name && recipient.mobile?.trim());
        if (validRecipients.length !== 1) {
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: payload.recipients.length, note: "The current live WhatsApp setup still allows exactly one configured recipient." }, 400);
        }

        const recipient = validRecipients[0];
        const configuredRecipient = process.env.WHATSAPP_RECIPIENT_PHONE?.replace(/\D/g, "");
        const selectedRecipient = recipient.mobile.replace(/\D/g, "");
        if (!configuredRecipient) return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 1, note: "WHATSAPP_RECIPIENT_PHONE is not configured on the server." }, 503);
        if (configuredRecipient !== selectedRecipient) return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 1, note: "The selected recipient does not match the configured live WhatsApp recipient." }, 403);

        const reminderTitle = payload.kind === "due-reminder" ? "WhatsApp due reminder" : payload.kind === "purchase-summary" ? "WhatsApp purchase record" : "WhatsApp custom message";

        try {
          const result = await sendWhatsAppText({ name: recipient.name, due: recipient.due, message: payload.message });
          if (result.messageId) {
            await supabaseAdmin.from("reminder_logs").insert({ reminder_title: reminderTitle, recipient: recipient.name, channel: "whatsapp", sent_at: new Date().toISOString(), delivery: "sent", retries: 0 });
          }
          return json({ ok: true, mode: "live", acceptedCount: result.messageId ? 1 : 0, skippedCount: result.messageId ? 0 : 1, messageId: result.messageId, note: "WhatsApp message accepted by Meta Cloud API." });
        } catch (error) {
          try { await supabaseAdmin.from("reminder_logs").insert({ reminder_title: reminderTitle, recipient: recipient.name, channel: "whatsapp", sent_at: new Date().toISOString(), delivery: "failed", retries: 0 }); } catch { /* Preserve the Meta error. */ }
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 1, note: error instanceof Error ? error.message : "WhatsApp delivery failed." }, 502);
        }
      },
    },
  },
});
