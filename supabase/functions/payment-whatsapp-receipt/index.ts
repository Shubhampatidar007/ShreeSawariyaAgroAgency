import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WHATSAPP_API_VERSION = Deno.env.get("WHATSAPP_API_VERSION")?.trim() || "v25.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildPaymentReceiptMessage = (order: any, payment: any) => {
  const remaining = Math.max(Number(order.total || 0) - Number(order.paid || 0), 0);

  return `🌾 SHREE SAWARIYA AGRO AGENCY

✅ PAYMENT RECEIVED

Dear ${order.customer_name || "Customer"},

Your payment for order ${order.code} has been recorded successfully.

💰 PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━
Amount Collected: ₹${money(payment?.amount)}
Payment Method: ${payment?.method || order.payment_method || "—"}
Payment Date: ${formatDateTime(payment?.created_at || new Date().toISOString())}

🧾 ORDER SUMMARY
━━━━━━━━━━━━━━━━━━
Order Total: ₹${money(order.total)}
Total Paid: ₹${money(order.paid)}
Remaining Due: ₹${money(remaining)}

Thank you for your payment. 🙏

🌾 Shree Sawariya Agro Agency`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Only POST is supported." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_BUSINESS_PHONE_NUMBER_ID")?.trim();

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !accessToken || !phoneNumberId) {
    return json({ ok: false, error: "Payment WhatsApp receipt is not fully configured." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ ok: false, error: "Authorization required." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return json({ ok: false, error: "Invalid or expired session." }, 401);
  }

  const { data: roleRow, error: roleError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleRow) {
    return json({ ok: false, error: "Admin access required." }, 403);
  }

  let payload: { orderId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  if (!payload.orderId) {
    return json({ ok: false, error: "orderId is required." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", payload.orderId)
    .eq("channel", "online")
    .maybeSingle();

  if (orderError || !order) {
    return json({ ok: false, error: orderError?.message || "Online order not found." }, 404);
  }

  const to = normalizePhone(order.mobile || "");
  if (!to) return json({ ok: false, error: "Customer mobile number is empty." }, 400);

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("amount, method, created_at, entry_date, reference")
    .eq("order_code", order.code)
    .eq("direction", "incoming")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) return json({ ok: false, error: paymentError.message }, 500);
  if (!payment) return json({ ok: false, error: "No collected payment was found for this order." }, 400);

  const endpoint = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
  const message = buildPaymentReceiptMessage(order, payment);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    const body = await response.json().catch(() => null) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    } | null;

    const messageId = body?.messages?.[0]?.id;

    if (!response.ok || !messageId) {
      return json(
        { ok: false, error: body?.error?.message || `Meta returned HTTP ${response.status}.` },
        502,
      );
    }

    await admin.from("reminder_logs").insert({
      reminder_title: "WhatsApp online order payment receipt",
      recipient: order.customer_name || order.mobile || "Online customer",
      channel: "whatsapp",
      sent_at: new Date().toISOString(),
      delivery: "sent",
      retries: 0,
    });

    return json({
      ok: true,
      messageId,
      orderId: order.id,
      orderCode: order.code,
      recipient: order.mobile,
      note: "Payment receipt accepted by Meta Cloud API.",
    });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "Payment receipt failed." },
      502,
    );
  }
});
