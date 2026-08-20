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
 * Loads only the data required by the current admin route.
 * The overview has its own dedicated loader, so this file is only used
 * for child admin sections.
 */
export function ensureAdminSectionData(force = false) {
  if (typeof window === "undefined") return Promise.resolve();

  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);
  const isCustomerDetail =
    path.startsWith("/admin/customers/") && segments.length >= 3;
  const scope = path.startsWith("/admin/khata/customers/")
    ? "customer-khata"
    : isCustomerDetail
      ? "customer-detail"
      : path === "/admin/customers" || path === "/admin/customers/"
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

  const customerId = isCustomerDetail || scope === "customer-khata"
    ? segments.at(-1)
    : undefined;
  const cacheKey = customerId ? `${scope}:${customerId}` : scope;

  if (!force && lastLoadedAt && lastScope === cacheKey && Date.now() - lastLoadedAt < CACHE_MS) {
    return Promise.resolve();
  }

  if (pending) return pending;

  pending = (async () => {
    switch (scope) {
      case "customer-khata": {
        if (!customerId) throw new Error("Missing customer ID for khata route");
        setAdminFeatureState(await loadCustomerKhataFeature(customerId));
        break;
      }
      case "customer-detail": {
        if (!customerId) throw new Error("Missing customer ID for customer route");
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
        const [inventoryData, suppliers] = await Promise.all([
          loadInventoryFeature(),
          loadSuppliersFeature(),
        ]);
        setAdminFeatureState({
          ...inventoryData,
          suppliers,
        });
        break;
      }
      case "products":
        setAdminFeatureState({ products: await loadProductsFeature() });
        break;
      case "sales": {
        const [sales, customers, inventoryData, products] = await Promise.all([
          loadSalesFeature(),
          loadCustomersFeature(),
          loadInventoryFeature(),
          loadProductsFeature(),
        ]);
        setAdminFeatureState({
          ...sales,
          customers,
          inventory: inventoryData.inventory,
          reminders: inventoryData.reminders,
          products,
        });
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
    lastScope = cacheKey;
  })().finally(() => {
    pending = null;
  });

  return pending;
}

export function invalidateAdminSectionData() {
  lastLoadedAt = 0;
  lastScope = "";
}
