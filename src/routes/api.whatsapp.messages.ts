import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cmfqlpcrnkswgxrszoog.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4VzGDmax-6XyPaW1NomaNQ_kotGVa9i";
const EDGE_FUNCTION_NAME = "whatsapp-meta-messages";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/whatsapp/messages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");

        if (!authorization?.startsWith("Bearer ")) {
          return json(
            {
              ok: false,
              mode: "live",
              acceptedCount: 0,
              skippedCount: 0,
              note: "Authentication is required.",
            },
            401,
          );
        }

        let body: string;

        try {
          body = await request.text();
          if (!body.trim()) {
            return json(
              {
                ok: false,
                mode: "live",
                acceptedCount: 0,
                skippedCount: 0,
                note: "Request body is required.",
              },
              400,
            );
          }
        } catch {
          return json(
            {
              ok: false,
              mode: "live",
              acceptedCount: 0,
              skippedCount: 0,
              note: "Unable to read request body.",
            },
            400,
          );
        }

        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authorization,
              apikey: SUPABASE_PUBLISHABLE_KEY,
            },
            body,
          });

          const responseBody = await response.text();

          return new Response(responseBody, {
            status: response.status,
            headers: {
              "Content-Type": response.headers.get("content-type") || "application/json",
            },
          });
        } catch (error) {
          return json(
            {
              ok: false,
              mode: "live",
              acceptedCount: 0,
              skippedCount: 0,
              note:
                error instanceof Error
                  ? error.message
                  : "Unable to reach the WhatsApp Edge Function.",
            },
            502,
          );
        }
      },
    },
  },
});
