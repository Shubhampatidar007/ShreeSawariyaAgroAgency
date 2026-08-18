import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Customer,
  CustomerLedgerEntry,
  CustomerSaleItem,
  InventoryItem,
  KhataSaleItemInput,
  PublishedProduct,
  Supplier,
  SupplierLedgerEntry,
} from "@/types/business";
import type {
  Advertisement,
  Backup,
  PaymentRecord,
  Reminder,
  ReminderLog,
  CmsSection,
  AdminNotification,
} from "@/types";
import type { Order } from "@/types/operations";

// ... existing shop-store implementation remains unchanged ...

/** Loads once per session. Data is refreshed explicitly after mutations. */
export function initShopData() {
  if (typeof window === "undefined") return null;

  if (!loadPromise) {
    loadPromise = loadShopData().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  return loadPromise;
}
