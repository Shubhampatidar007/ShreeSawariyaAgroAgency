import { supabase } from "@/integrations/supabase/client";
import { setAdminFeatureState, shopStore } from "@/lib/shop-store";
import type { InventoryItem } from "@/types/business";

let inventoryLoadPromise: Promise<InventoryItem[]> | null = null;

function toInventory(r: any): InventoryItem {
  return {
    id: r.id,
    productName: r.product_name,
    supplierId: r.supplier_id ?? "",
    supplierName: r.supplier_name ?? "",
    quantity: Number(r.quantity ?? 0),
    unit: r.unit,
    purchasePrice: Number(r.purchase_price ?? 0),
    totalPrice: Number(r.total_price ?? 0),
    minStockLevel: Number(r.min_stock_level ?? 0),
    status: r.status,
    lastUpdated: r.last_updated,
  };
}

/**
 * Load inventory only when the Khata sale flow needs it.
 * Reuses the in-memory store when inventory is already available and
 * deduplicates concurrent requests while the first request is in flight.
 */
export async function loadKhataInventory(): Promise<InventoryItem[]> {
  const cachedInventory = shopStore.get().inventory;

  if (cachedInventory.length > 0) {
    return cachedInventory;
  }

  if (inventoryLoadPromise) {
    return inventoryLoadPromise;
  }

  inventoryLoadPromise = (async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("product_name");

    if (error) {
      throw error;
    }

    const inventory = (data ?? []).map(toInventory);
    setAdminFeatureState({ inventory });
    return inventory;
  })();

  try {
    return await inventoryLoadPromise;
  } finally {
    inventoryLoadPromise = null;
  }
}
