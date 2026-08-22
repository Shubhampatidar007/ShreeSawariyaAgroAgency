export type EntityStatus = "active" | "inactive" | "blocked";

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
  "inventory-only" | "published" | "hidden" | "out-of-stock" | "archived";

export type InventoryItem = {
  id: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  totalPrice: number;
  minStockLevel: number;
  status: InventoryStatus;
  lastUpdated: string;
};

export type PublishedProduct = {
  id: string;
  inventoryId: string;
  title: string;
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
  product: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type KhataSaleItemInput = {
  inventoryId?: string | undefined;
  productId?: string | undefined;
  product: string;
  quantity: number;
  unit: string;
  rate: number;
};
export type SupplierLedgerEntry = {
  id: string;
  supplierId: string;
  date: string;
  type: "purchase" | "payment" | "advance";
  reference: string;
  amount: number;
  balance: number;
  method: PaymentMethod;
  remarks?: string | undefined;
};
