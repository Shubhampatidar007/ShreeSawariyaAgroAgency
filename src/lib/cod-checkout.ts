import { supabase } from "@/integrations/supabase/client";

export type CodCheckoutInput = {
  customerName: string;
  mobile: string;
  village: string;
  address: string;
  pincode: string;
  items: Array<{ id: string; qty: number }>;
  remarks?: string;
};

export async function placeCodOrder(input: CodCheckoutInput) {
  const { data, error } = await supabase.rpc("place_cod_order", {
    _customer_name: input.customerName,
    _mobile: input.mobile,
    _village: input.village,
    _address: input.address,
    _pincode: input.pincode,
    _items: input.items,
    _remarks: input.remarks ?? null,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.order_code) throw new Error("Order could not be created");

  return {
    orderId: String(row.order_id),
    orderCode: String(row.order_code),
    total: Number(row.order_total ?? 0),
  };
}
