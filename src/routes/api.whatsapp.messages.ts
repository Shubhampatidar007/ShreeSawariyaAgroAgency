import { createFileRoute } from "@tanstack/react-router";
import type { WhatsAppSendRequest } from "@/lib/whatsapp";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp.server";

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
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: 0, note: "Message type, recipients and message text are required." }, 400);
        }

        const validRecipients = payload.recipients.filter((recipient) => recipient.id && recipient.name && recipient.mobile?.trim());

        if (validRecipients.length === 0) {
          return json({ ok: false, mode: "live", acceptedCount: 0, skippedCount: payload.recipients.length, note: "No valid WhatsApp recipients were selected." }, 400);
        }

        if (payload.kind !== "receipt") {
          return json({
            ok: false,
            mode: "live",
            acceptedCount: 0,
            skippedCount: validRecipients.length,
            note: "The configured Meta template is an order-confirmation template. Add an approved reminder/custom template before enabling this message type.",
          }, 422);
        }

        const results: string[] = [];
        const failures: string[] = [];
        const orderDate = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }).format(new Date());

        for (const recipient of validRecipients) {
          if (!recipient.receiptId) {
            failures.push(`${recipient.name}: missing order/receipt ID`);
            continue;
          }

          try {
            const result = await sendWhatsAppOrderConfirmation({
              mobile: recipient.mobile,
              customerName: recipient.name,
              orderId: recipient.receiptId,
              orderDate,
            });
            if (result.messageId) results.push(result.messageId);
          } catch (error) {
            failures.push(`${recipient.name}: ${error instanceof Error ? error.message : "WhatsApp delivery failed"}`);
          }
        }

        const acceptedCount = results.length;
        const skippedCount = payload.recipients.length - acceptedCount;

        return json({
          ok: acceptedCount > 0 && failures.length === 0,
          mode: "live",
          acceptedCount,
          skippedCount,
          messageId: results[0],
          note: failures.length > 0
            ? `${acceptedCount} delivered. ${failures.length} failed: ${failures.join("; ")}`
            : `${acceptedCount} WhatsApp message${acceptedCount === 1 ? "" : "s"} delivered through Meta Cloud API.`,
        }, acceptedCount > 0 ? 200 : 502);
      },
    },
  },
});
