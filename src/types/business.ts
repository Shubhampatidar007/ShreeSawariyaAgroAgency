export type EntityStatus = "active" | "inactive" | "blocked";

export type ProductVariant = {
  id: string;
  productId?: string;
  inventoryId?: string;
  label: string;
  sellingPrice: number;
  discountPrice?: number;
  stock: number;
  status: "active" | "inactive" | "archived";
};

export type Customer = {
  id: string;
  name: string;
  mobile: string;
  village: string;
  address: string;
  joinedOn: string;
  creditLimit: number;
  creditBalance: number;
  totalPurchases: number;
  totalPaid: number;
  currentDue: number;
  lastPurchase: string;
  status: EntityStatus;
  notes?: string | undefined;
};

export type Supplier = {
  id: string;
  name: string;
  company: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  productsSupplied: string[];
  totalPurchases: number;
  totalPaid: number;
  advance: number;
  dueBalance: number;
  lastOrder: string;
  status: EntityStatus;
};

export type InventoryStatus =
  "inventory-only" | "published" | "hidden" | "out-of-stock" | "archived" | "in-stock";

export type InventoryItem = {
  id: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  /** Legacy/package-equivalent stock quantity. */
  quantity: number;
  /** Existing display/package unit kept for backward compatibility. */
  unit: string;
  purchasePrice: number;
  sellingPrice?: number;
  totalPrice: number;
  minStockLevel: number;
  status: InventoryStatus;
  lastUpdated: string;
  productVariantId?: string;

  /** Canonical physical stock model. */
  baseQuantity: number;
  baseUnit: string;
  packageSize: number;
  allowLooseSale: boolean;
  purchasePricePerBaseUnit: number;
  sellingPricePerBaseUnit?: number;
};

export type PublishedProduct = {
  id: string;
  inventoryId: string;
  title: string;
  brand?: string;
  category: string;
  sellingPrice: number;
  discountPrice?: number | undefined;
  stock: number;
  description: string;
  tags: string[];
  images: string[];
  emoji: string;
  visibility: "public" | "hidden";
  featured: boolean;
  status: "published" | "draft" | "archived";
  publishedOn: string;
  variants?: ProductVariant[];
};

export type Testimonial = {
  id: string;
  name: string;
  location: string;
  crop: string;
  quote: string;
  imageUrl?: string | undefined;
  enabled: boolean;
};

export type PaymentMethod = "cash" | "upi" | "bank" | "cheque" | "credit";

export type CustomerLedgerEntry = {
  id: string;
  customerId: string;
  date: string;
  entryType: "purchase" | "payment" | "credit" | "adjustment";
  product: string;
  quantity: number;
  amount: number;
  payment: number;
  remainingDue: number;
  method: PaymentMethod;
  remarks?: string | undefined;
};
export type CustomerSaleItem = {
  id: string;
  transactionId: string;
  productId?: string | undefined;
  productVariantId?: string | undefined;
  product: string;
  /** Customer-entered sale quantity/unit. */
  quantity: number;
  unit: string;
  /** Historical selling rate per canonical base unit. */
  rate: number;
  /** Historical final line selling value after any explicit line override. */
  amount: number;

  // Normalized historical sale snapshot
  enteredQuantity?: number | undefined;
  enteredUnit?: string | undefined;
  baseQuantity?: number | undefined;
  baseUnit?: string | undefined;
  purchaseCostPerBaseUnit?: number | undefined;
  sellingRatePerBaseUnit?: number | undefined;
  calculatedAmount?: number | undefined;
  finalSaleAmount?: number | undefined;

  // Legacy snapshot fields kept for old transactions/consumers
  purchaseCost?: number | undefined;
  adminPriceInc?: number | undefined;

  // Parent customer_transactions.entry_date
  date?: string | undefined;

  // Historical transaction-level bargaining snapshot; kept out of item UI.
  transactionSubtotal?: number | undefined;
  transactionDiscount?: number | undefined;
};

export type KhataSaleItemInput = {
  inventoryId?: string;
  productId?: string;
  productVariantId?: string;
  product: string;
  /** Customer-entered quantity and sale unit. */
  quantity: number;
  unit: string;
  /** Selling rate per canonical base unit, before line amount override. */
  rate: number;
  /** Optional final amount override. */
  finalAmount?: number;
};
export type SupplierLedgerEntry = {
  id: string;
  supplierId: string;
  date: string;
  entryType: "purchase" | "payment" | "advance";
  reference: string;
  amount: number;
  balance: number;
  method: PaymentMethod;
  remarks?: string | undefined;
};
