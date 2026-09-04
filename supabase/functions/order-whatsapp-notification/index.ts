import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_WHATSAPP_NUMBER = "9752469028";
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

const buildOrderMessage = (order: any) => {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const itemLines = items.length
    ? items
        .map(
          (item: any) =>
            `• ${item.product}\n  Qty: ${Number(item.quantity || 0)} ${item.unit || "unit"} × ₹${money(item.rate)}\n  Amount: ₹${money(item.amount)}`,
        )
        .join("\n\n")
    : "• No item details available.";

  return `🌾 Shree Sanwariya Agro Agency  

🆕 NEW ONLINE ORDER RECEIVED

Order: ${order.code}
Date: ${formatDateTime(order.placed_on)}

👤 CUSTOMER
Name: ${order.customer_name || "—"}
Mobile: ${order.mobile || "—"}
Village / City: ${order.village || "—"}
Address: ${order.delivery_address || "—"}

🛒 ORDER ITEMS
━━━━━━━━━━━━━━━━━━
${itemLines}

━━━━━━━━━━━━━━━━━━
Total Amount: ₹${money(order.total)}
Payment: ${order.payment_method || "—"}
Payment Status: ${order.payment_status || "—"}
Order Status: ${order.order_status || "—"}

Please check the admin order section for full details.

🌾 Shree Sanwariya Agro Agency  `;
};

const buildCustomerOrderMessage = (order: any) => {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const itemLines = items.length
    ? items
        .map(
          (item: any) =>
            `• ${item.product} — Qty ${Number(item.quantity || 0)} ${item.unit || "unit"} — ₹${money(item.amount)}`,
        )
        .join("\n")
    : "• No item details available.";

  return `🌾 Shree Sanwariya Agro Agency  

✅ YOUR ORDER HAS BEEN RECEIVED

Dear ${order.customer_name || "Customer"},

Your online order has been received successfully and your package is being prepared for dispatch.

🧾 ORDER DETAILS
━━━━━━━━━━━━━━━━━━
Order: ${order.code}
Date & Time: ${formatDateTime(order.placed_on)}

🛒 PRODUCTS
${itemLines}

━━━━━━━━━━━━━━━━━━
Total Amount: ₹${money(order.total)}
Payment Method: ${order.payment_method || "—"}
Payment Status: ${order.payment_status || "—"}
Order Status: ${order.order_status || "—"}

📦 We will keep you updated when the package is dispatched.

For any further query, please contactShree Sanwariya Agro Agency  .

Thank you for choosing us. 🙏

🌾 Shree Sanwariya Agro Agency`;
};

const sendWhatsAppText = async ({
  accessToken,
  phoneNumberId,
  to,
  message,
}: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  message: string;
}) => {
  const endpoint = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
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
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const body = await response.json().catch(() => null) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  } | null;

  const messageId = body?.messages?.[0]?.id;

  if (!response.ok || !messageId) {
    throw new Error(body?.error?.message || `Meta returned HTTP ${response.status}.`);
  }

  return messageId;
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
    return json({ ok: false, error: "Order WhatsApp notification is not fully configured." }, 500);
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
    .maybeSingle();

  if (orderError || !order) {
    return json({ ok: false, error: orderError?.message || "Order not found." }, 404);
  }

  if (!order.customer_id) {
    return json({ ok: false, error: "Order is missing its customer association." }, 403);
  }

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id")
    .eq("id", order.customer_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError || !customer) {
    return json({ ok: false, error: "You are not authorized to notify this order." }, 403);
  }

  const adminTo = normalizePhone(ADMIN_WHATSAPP_NUMBER);
  const customerTo = normalizePhone(order.mobile || "");
  if (!customerTo) {
    return json({ ok: false, error: "Customer mobile number is empty." }, 400);
  }

  try {
    const adminMessageId = await sendWhatsAppText({
      accessToken,
      phoneNumberId,
      to: adminTo,
      message: buildOrderMessage(order),
    });

    let customerMessageId = "";
    let customerNotificationError = "";

    try {
      customerMessageId = await sendWhatsAppText({
        accessToken,
        phoneNumberId,
        to: customerTo,
        message: buildCustomerOrderMessage(order),
      });
    } catch (error) {
      customerNotificationError =
        error instanceof Error ? error.message : "Customer WhatsApp notification failed.";
    }

    await admin.from("reminder_logs").insert({
      reminder_title: "WhatsApp online order notification - admin",
      recipient: order.customer_name || order.mobile || "Online customer",
      channel: "whatsapp",
      sent_at: new Date().toISOString(),
      delivery: "sent",
      retries: 0,
    });

    if (customerMessageId) {
      await admin.from("reminder_logs").insert({
        reminder_title: "WhatsApp online order confirmation - customer",
        recipient: order.customer_name || order.mobile || "Online customer",
        channel: "whatsapp",
        sent_at: new Date().toISOString(),
        delivery: "sent",
        retries: 0,
      });
    }

    return json({
      ok: true,
      orderId: order.id,
      orderCode: order.code,
      adminMessageId,
      customerMessageId: customerMessageId || null,
      customerNotificationSent: Boolean(customerMessageId),
      customerNotificationError: customerNotificationError || null,
      note: customerMessageId
        ? "Admin and customer order notifications accepted by Meta Cloud API."
        : "Admin order notification accepted by Meta Cloud API; customer notification failed.",
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Order WhatsApp notification failed.",
      },
      502,
    );
  }
});
