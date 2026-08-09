export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          detail: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          detail?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          detail?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          audience: string
          clicks: number
          created_at: string
          id: string
          impressions: number
          placement: string
          runs_until: string
          starts_on: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          placement?: string
          runs_until?: string
          starts_on?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          placement?: string
          runs_until?: string
          starts_on?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          created_at: string
          destination: string
          id: string
          name: string
          size: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          destination?: string
          id?: string
          name: string
          size?: string
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          name?: string
          size?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          headline: string
          id: string
          image_label: string
          name: string
          scheduled_from: string | null
          scheduled_to: string | null
          sort_order: number
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          created_at?: string
          enabled?: boolean
          headline?: string
          id?: string
          image_label?: string
          name: string
          scheduled_from?: string | null
          scheduled_to?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          headline?: string
          id?: string
          image_label?: string
          name?: string
          scheduled_from?: string | null
          scheduled_to?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      customer_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          entry_date: string
          entry_type: string
          id: string
          method: string
          order_id: string | null
          payment: number
          product: string
          quantity: number
          remaining_due: number
          remarks: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          entry_date?: string
          entry_type?: string
          id?: string
          method?: string
          order_id?: string | null
          payment?: number
          product?: string
          quantity?: number
          remaining_due?: number
          remarks?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          entry_date?: string
          entry_type?: string
          id?: string
          method?: string
          order_id?: string | null
          payment?: number
          product?: string
          quantity?: number
          remaining_due?: number
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          created_at: string
          credit_balance: number
          credit_limit: number
          current_due: number
          id: string
          joined_on: string
          last_purchase: string | null
          legacy_id: string | null
          mobile: string
          name: string
          notes: string | null
          status: string
          total_paid: number
          total_purchases: number
          updated_at: string
          user_id: string | null
          village: string
        }
        Insert: {
          address?: string
          created_at?: string
          credit_balance?: number
          credit_limit?: number
          current_due?: number
          id?: string
          joined_on?: string
          last_purchase?: string | null
          legacy_id?: string | null
          mobile: string
          name: string
          notes?: string | null
          status?: string
          total_paid?: number
          total_purchases?: number
          updated_at?: string
          user_id?: string | null
          village?: string
        }
        Update: {
          address?: string
          created_at?: string
          credit_balance?: number
          credit_limit?: number
          current_due?: number
          id?: string
          joined_on?: string
          last_purchase?: string | null
          legacy_id?: string | null
          mobile?: string
          name?: string
          notes?: string | null
          status?: string
          total_paid?: number
          total_purchases?: number
          updated_at?: string
          user_id?: string | null
          village?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          legacy_id: string | null
          min_stock_level: number
          product_name: string
          purchase_price: number
          quantity: number
          status: string
          supplier_id: string | null
          supplier_name: string
          total_price: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          legacy_id?: string | null
          min_stock_level?: number
          product_name: string
          purchase_price?: number
          quantity?: number
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_price?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          legacy_id?: string | null
          min_stock_level?: number
          product_name?: string
          purchase_price?: number
          quantity?: number
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_price?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          source_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          source_id?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          source_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          product: string
          product_id: string | null
          quantity: number
          rate: number
          unit: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_id: string
          product: string
          product_id?: string | null
          quantity?: number
          rate?: number
          unit?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          product?: string
          product_id?: string | null
          quantity?: number
          rate?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_type: string
          delivery_status: string
          discount: number
          id: string
          invoice_status: string
          mobile: string
          order_status: string
          paid: number
          payment_method: string
          payment_status: string
          placed_on: string
          remarks: string | null
          subtotal: number
          tax: number
          timeline: Json
          total: number
          updated_at: string
          village: string
        }
        Insert: {
          channel?: string
          code: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_type?: string
          delivery_status?: string
          discount?: number
          id?: string
          invoice_status?: string
          mobile?: string
          order_status?: string
          paid?: number
          payment_method?: string
          payment_status?: string
          placed_on?: string
          remarks?: string | null
          subtotal?: number
          tax?: number
          timeline?: Json
          total?: number
          updated_at?: string
          village?: string
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_type?: string
          delivery_status?: string
          discount?: number
          id?: string
          invoice_status?: string
          mobile?: string
          order_status?: string
          paid?: number
          payment_method?: string
          payment_status?: string
          placed_on?: string
          remarks?: string | null
          subtotal?: number
          tax?: number
          timeline?: Json
          total?: number
          updated_at?: string
          village?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          direction: string
          entry_date: string
          id: string
          method: string
          order_code: string | null
          party_id: string | null
          party_name: string
          reference: string
          remarks: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          direction?: string
          entry_date?: string
          id?: string
          method?: string
          order_code?: string | null
          party_id?: string | null
          party_name?: string
          reference: string
          remarks?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          direction?: string
          entry_date?: string
          id?: string
          method?: string
          order_code?: string | null
          party_id?: string | null
          party_name?: string
          reference?: string
          remarks?: string | null
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          discount_price: number | null
          emoji: string
          featured: boolean
          id: string
          images: string[]
          inventory_id: string | null
          legacy_id: string | null
          published_on: string
          selling_price: number
          status: string
          stock: number
          tags: string[]
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          discount_price?: number | null
          emoji?: string
          featured?: boolean
          id?: string
          images?: string[]
          inventory_id?: string | null
          legacy_id?: string | null
          published_on?: string
          selling_price?: number
          status?: string
          stock?: number
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          discount_price?: number | null
          emoji?: string
          featured?: boolean
          id?: string
          images?: string[]
          inventory_id?: string | null
          legacy_id?: string | null
          published_on?: string
          selling_price?: number
          status?: string
          stock?: number
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          mobile: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          mobile?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          mobile?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          channel: string
          delivery: string
          id: string
          recipient: string
          reminder_title: string
          retries: number
          sent_at: string
        }
        Insert: {
          channel?: string
          delivery?: string
          id?: string
          recipient?: string
          reminder_title: string
          retries?: number
          sent_at?: string
        }
        Update: {
          channel?: string
          delivery?: string
          id?: string
          recipient?: string
          reminder_title?: string
          retries?: number
          sent_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          audience: string
          channel: string
          created_at: string
          due_amount: number
          filter_summary: string
          id: string
          kind: string
          message: string
          next_run: string
          schedule: string
          source_id: string | null
          status: string
          target: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          channel?: string
          created_at?: string
          due_amount?: number
          filter_summary?: string
          id?: string
          kind?: string
          message?: string
          next_run?: string
          schedule?: string
          source_id?: string | null
          status?: string
          target?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          channel?: string
          created_at?: string
          due_amount?: number
          filter_summary?: string
          id?: string
          kind?: string
          message?: string
          next_run?: string
          schedule?: string
          source_id?: string | null
          status?: string
          target?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          account: string
          created_at: string
          device: string
          event: string
          id: string
          ip: string
          location: string
          severity: string
          status: string
        }
        Insert: {
          account?: string
          created_at?: string
          device?: string
          event: string
          id?: string
          ip?: string
          location?: string
          severity?: string
          status?: string
        }
        Update: {
          account?: string
          created_at?: string
          device?: string
          event?: string
          id?: string
          ip?: string
          location?: string
          severity?: string
          status?: string
        }
        Relationships: []
      }
      supplier_transactions: {
        Row: {
          amount: number
          balance: number
          created_at: string
          entry_date: string
          entry_type: string
          id: string
          method: string
          reference: string
          remarks: string | null
          supplier_id: string
        }
        Insert: {
          amount?: number
          balance?: number
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          method?: string
          reference?: string
          remarks?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          method?: string
          reference?: string
          remarks?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          advance: number
          company: string
          created_at: string
          due_balance: number
          email: string
          gstin: string
          id: string
          last_order: string | null
          legacy_id: string | null
          mobile: string
          name: string
          products_supplied: string[]
          status: string
          total_paid: number
          total_purchases: number
          updated_at: string
        }
        Insert: {
          address?: string
          advance?: number
          company?: string
          created_at?: string
          due_balance?: number
          email?: string
          gstin?: string
          id?: string
          last_order?: string | null
          legacy_id?: string | null
          mobile?: string
          name: string
          products_supplied?: string[]
          status?: string
          total_paid?: number
          total_purchases?: number
          updated_at?: string
        }
        Update: {
          address?: string
          advance?: number
          company?: string
          created_at?: string
          due_balance?: number
          email?: string
          gstin?: string
          id?: string
          last_order?: string | null
          legacy_id?: string | null
          mobile?: string
          name?: string
          products_supplied?: string[]
          status?: string
          total_paid?: number
          total_purchases?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      recalc_customer_balance: {
        Args: { _customer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "customer"],
    },
  },
} as const
