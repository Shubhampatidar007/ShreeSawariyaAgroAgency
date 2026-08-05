import { useSyncExternalStore } from "react";
import { customerLedgerSeed, customersSeed } from "@/data/customers";
import { inventorySeed, publishedProductsSeed } from "@/data/inventory";
import { supplierLedgerSeed, suppliersSeed } from "@/data/suppliers";
import type {
  Customer,
  CustomerLedgerEntry,
  InventoryItem,
  PublishedProduct,
  Supplier,
  SupplierLedgerEntry,
} from "@/types/business";

type ShopState = {
  customers: Customer[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  products: PublishedProduct[];
  customerLedger: CustomerLedgerEntry[];
  supplierLedger: SupplierLedgerEntry[];
  draftProduct: PublishedProduct | null;
};

let state: ShopState = {
  customers: customersSeed,
  suppliers: suppliersSeed,
  inventory: inventorySeed,
  products: publishedProductsSeed,
  customerLedger: customerLedgerSeed,
  supplierLedger: supplierLedgerSeed,
  draftProduct: null,
};

const listeners = new Set<() => void>();

function setState(update: Partial<ShopState>) {
  state = { ...state, ...update };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useShopStore<T>(selector: (s: ShopState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
}

export const shopStore = {
  get: getSnapshot,

  addCustomer(customer: Omit<Customer, "id">) {
    const created: Customer = { ...customer, id: `c${Date.now()}` };
    setState({ customers: [created, ...state.customers] });
    return created;
  },
  updateCustomer(id: string, patch: Partial<Customer>) {
    setState({
      customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  },
  deleteCustomer(id: string) {
    setState({ customers: state.customers.filter((c) => c.id !== id) });
  },

  addSupplier(supplier: Omit<Supplier, "id">) {
    const created: Supplier = { ...supplier, id: `s${Date.now()}` };
    setState({ suppliers: [created, ...state.suppliers] });
    return created;
  },
  updateSupplier(id: string, patch: Partial<Supplier>) {
    setState({
      suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  },
  deleteSupplier(id: string) {
    setState({ suppliers: state.suppliers.filter((s) => s.id !== id) });
  },

  addInventoryItem(item: Omit<InventoryItem, "id">) {
    const created: InventoryItem = { ...item, id: `i${Date.now()}` };
    setState({ inventory: [created, ...state.inventory] });
    return created;
  },
  updateInventoryItem(id: string, patch: Partial<InventoryItem>) {
    setState({
      inventory: state.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  },
  deleteInventoryItem(id: string) {
    setState({ inventory: state.inventory.filter((i) => i.id !== id) });
  },

  setDraftProduct(draft: PublishedProduct | null) {
    setState({ draftProduct: draft });
  },
  publishProduct(product: PublishedProduct) {
    setState({
      products: [product, ...state.products.filter((p) => p.id !== product.id)],
      inventory: state.inventory.map((i) =>
        i.id === product.inventoryId ? { ...i, status: "published" } : i,
      ),
      draftProduct: null,
    });
  },
  updateProduct(id: string, patch: Partial<PublishedProduct>) {
    setState({
      products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  },
  deleteProduct(id: string) {
    setState({ products: state.products.filter((p) => p.id !== id) });
  },
};

export const formatCurrency = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });