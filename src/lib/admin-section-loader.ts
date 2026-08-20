import {
  loadCustomersFeature,
  loadInventoryFeature,
  loadPaymentsFeature,
  loadProductsFeature,
  loadRemindersFeature,
  loadSalesFeature,
  loadSuppliersFeature,
} from "@/lib/admin-feature-loaders";
import { loadCustomerKhataFeature } from "@/lib/admin-khata-loader";
import { setAdminFeatureState } from "@/lib/shop-store";
import { loadAdminShopData } from "@/lib/shop-store";

let lastLoadedAt = 0;
let pending: Promise<void> | null = null;
let lastScope = "";
const CACHE_MS = 30_000;

/**
 * Keeps legacy admin modules working while progressively replacing the
 * all-data read with route-scoped reads. Existing mutations/business logic
 * remain in shopStore.
 */
export function ensureAdminSectionData(force = false) {
  if (typeof window === "undefined") return Promise.resolve();

  const path = window.location.pathname;
  const scope = path.startsWith("/admin/khata/customers/")
    ? "customer-khata"
    : path.startsWith("/admin/customers")
      ? "customers"
      : path.startsWith("/admin/suppliers")
        ? "suppliers"
        : path.startsWith("/admin/inventory")
          ? "inventory"
          : path.startsWith("/admin/products")
            ? "products"
            : path.startsWith("/admin/sales")
              ? "sales"
              : path.startsWith("/admin/payments")
                ? "payments"
                : path.startsWith("/admin/reminders")
                  ? "reminders"
                  : "legacy";

  if (!force && lastLoadedAt && lastScope === scope && Date.now() - lastLoadedAt < CACHE_MS) {
    return Promise.resolve();
  }

  if (pending) return pending;

  pending = (async () => {
    switch (scope) {
      case "customer-khata": {
        const customerId = path.split("/").filter(Boolean).at(-1);
        if (!customerId) throw new Error("Missing customer ID for khata route");
        setAdminFeatureState(await loadCustomerKhataFeature(customerId));
        break;
      }
      case "customers":
        setAdminFeatureState({ customers: await loadCustomersFeature() });
        break;
      case "suppliers":
        setAdminFeatureState({ suppliers: await loadSuppliersFeature() });
        break;
      case "inventory": {
        const data = await loadInventoryFeature();
        setAdminFeatureState(data);
        break;
      }
      case "products":
        setAdminFeatureState({ products: await loadProductsFeature() });
        break;
      case "sales": {
        const data = await loadSalesFeature();
        setAdminFeatureState(data);
        break;
      }
      case "payments": {
        const data = await loadPaymentsFeature();
        setAdminFeatureState(data);
        break;
      }
      case "reminders": {
        const data = await loadRemindersFeature();
        setAdminFeatureState(data);
        break;
      }
      default:
        await loadAdminShopData();
        break;
    }

    lastLoadedAt = Date.now();
    lastScope = scope;
  })().finally(() => {
    pending = null;
  });

  return pending;
}

export function invalidateAdminSectionData() {
  lastLoadedAt = 0;
  lastScope = "";
}
