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
  quantity: number;
  unit: string;
  quantityPerProduct?: number;
  purchasePrice: number;
  sellingPrice?: number;
  totalPrice: number;
  allowLooseSale?: boolean;
  minStockLevel: number;
  status: InventoryStatus;
  lastUpdated: string;
  productVariantId?: string;
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
  entryType: "purchase" | "payment" | "credit" | "adjustment" | "return";
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
  quantity: number;
  unit: string;
  rate: number;
  amount: number;

  // Historical New Khata snapshot values
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
  quantity: number;
  unit: string;
  rate: number;
  enteredQuantity?: number;
  enteredUnit?: string;
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

// ============ Interest Management types (Phase 5 + UI Phases 1-4) ============

export type InterestAgreementType = "sale" | "loan";
export type InterestRatePeriod = "monthly" | "annual";
export type InterestAgreementStatus = "active" | "paused" | "settled" | "closed";
export type InterestAdjustmentType = "waiver" | "write_off" | "rate_change" | "other";

export type InterestAgreement = {
  id: string;
  customerId: string;
  agreementType: InterestAgreementType;
  sourceTransactionId?: string | undefined;
  loanId?: string | undefined;
  originalPrincipal: number;
  outstandingPrincipal: number;
  interestRate: number;
  ratePeriod: InterestRatePeriod;
  interestStartDate: string;
  method: "simple";
  status: InterestAgreementStatus;
  notes?: string | undefined;
  termsConfirmed: boolean;
  createdAt: string;
  closedAt?: string | undefined;
  closedReason?: string | undefined;
  // Computed by accrue_interest_to_date (joined in loaders)
  accruedInterestTotal?: number | undefined;
  interestPaidTotal?: number | undefined;
  interestOutstanding?: number | undefined;
  principalPaidTotal?: number | undefined;
  totalSettlement?: number | undefined;
};

export type InterestPayment = {
  id: string;
  agreementId: string;
  paymentDate: string;
  amount: number;
  interestPortion: number;
  principalPortion: number;
  adjustmentPortion: number;
  method: PaymentMethod;
  reference?: string | undefined;
  notes?: string | undefined;
  ledgerTransactionId?: string | undefined;
  createdAt: string;
};

export type InterestAdjustment = {
  id: string;
  agreementId: string;
  adjustmentDate: string;
  adjustmentType: InterestAdjustmentType;
  interestDelta: number;
  principalDelta: number;
  reason: string;
  createdAt: string;
};

export type Loan = {
  id: string;
  customerId: string;
  principalDisbursed: number;
  disbursementDate: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
};

// Phase 1: Product sales search result row
export type ProductSaleSearchRow = {
  itemId: string;
  transactionId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerVillage: string;
  entryDate: string;
  product: string;
  quantity: number;
  unit: string;
  rate: number;
  itemAmount: number;
  transactionAmount: number;
  transactionPayment: number;
  transactionRemainingDue: number;
  transactionRemarks?: string | undefined;
  totalCount: number;
};

export type MostSoldProduct = {
  product: string;
  totalQuantity: number;
  totalAmount: number;
  transactionCount: number;
};

// Input shapes for the new RPCs (passed as jsonb)
export type InterestSettingsInput = {
  interestRate: number;
  ratePeriod: InterestRatePeriod;
  interestStartDate: string;
  eligiblePrincipal?: number | undefined;
  notes?: string | undefined;
  termsConfirmed: boolean;
};

export type DirectLoanInput = {
  customerId: string;
  principal: number;
  disbursementDate: string;
  interestRate: number;
  ratePeriod: InterestRatePeriod;
  interestStartDate: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | undefined;
  notes?: string | undefined;
};

export type InterestPaymentAllocation = {
  interestPortion?: number | undefined;
  principalPortion?: number | undefined;
};
