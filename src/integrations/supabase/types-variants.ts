import type { Database } from "./types";

type BaseTables = Database["public"]["Tables"];

type ProductVariantTable = {
  Row: {
    id: string;
    product_id: string | null;
    inventory_id: string | null;
    label: string;
    selling_price: number;
    discount_price: number | null;
    stock: number;
    status: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    product_id?: string | null;
    inventory_id?: string | null;
    label: string;
    selling_price?: number;
    discount_price?: number | null;
    stock?: number;
    status?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    product_id?: string | null;
    inventory_id?: string | null;
    label?: string;
    selling_price?: number;
    discount_price?: number | null;
    stock?: number;
    status?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "product_variants_product_id_fkey";
      columns: ["product_id"];
      isOneToOne: false;
      referencedRelation: "products";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "product_variants_inventory_id_fkey";
      columns: ["inventory_id"];
      isOneToOne: false;
      referencedRelation: "inventory_items";
      referencedColumns: ["id"];
    },
  ];
};

type InventoryItemTable = BaseTables["inventory_items"] & {
  Row: BaseTables["inventory_items"]["Row"] & {
    product_variant_id: string | null;
  };
  Insert: BaseTables["inventory_items"]["Insert"] & {
    product_variant_id?: string | null;
  };
  Update: BaseTables["inventory_items"]["Update"] & {
    product_variant_id?: string | null;
  };
};

type CustomerTransactionItemTable = BaseTables["customer_transaction_items"] & {
  Row: BaseTables["customer_transaction_items"]["Row"] & {
    product_variant_id: string | null;
  };
  Insert: BaseTables["customer_transaction_items"]["Insert"] & {
    product_variant_id?: string | null;
  };
  Update: BaseTables["customer_transaction_items"]["Update"] & {
    product_variant_id?: string | null;
  };
};

type OrderItemTable = BaseTables["order_items"] & {
  Row: BaseTables["order_items"]["Row"] & {
    product_variant_id: string | null;
  };
  Insert: BaseTables["order_items"]["Insert"] & {
    product_variant_id?: string | null;
  };
  Update: BaseTables["order_items"]["Update"] & {
    product_variant_id?: string | null;
  };
};

type VariantAwareTables = Omit<
  BaseTables,
  "product_variants" | "inventory_items" | "customer_transaction_items" | "order_items"
> & {
  product_variants: ProductVariantTable;
  inventory_items: InventoryItemTable;
  customer_transaction_items: CustomerTransactionItemTable;
  order_items: OrderItemTable;
};

export type DatabaseWithVariants = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: VariantAwareTables;
  };
};
