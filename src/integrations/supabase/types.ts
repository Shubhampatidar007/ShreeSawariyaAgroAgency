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
      auth_password_lockouts: {
        Row: {
          failed_attempts: number
          lock_level: number
          locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          failed_attempts?: number
          lock_level?: number
          locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          failed_attempts?: number
          lock_level?: number
          locked_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_signup_rate_limits: {
        Row: {
          attempt_count: number
          email: string
          lock_level: number
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          email: string
          lock_level?: number
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          email?: string
          lock_level?: number
          locked_until?: string | null
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
      business_stats: {
        Row: {
          customers_served: number
          id: number
          services_offered: number
          updated_at: string
          years_in_business: number
        }
        Insert: {
          customers_served?: number
          id: number
          services_offered?: number
          updated_at?: string
          years_in_business?: number
        }
        Update: {
          customers_served?: number
          id?: number
          services_offered?: number
          updated_at?: string
          years_in_business?: number
        }
        Relationships: []
      }
      business_stats_public: {
        Row: {
          customers_served: number
          id: number
          services_offered: number
          years_in_business: number
        }
        Insert: {
          customers_served?: number
          id: number
          services_offered?: number
          years_in_business?: number
        }
        Update: {
          customers_served?: number
          id?: number
          services_offered?: number
          years_in_business?: number
        }
        Relationships: []
      }
      checkout_otp_verifications: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          max_attempts: number
          order_id: string | null
          otp_hash: string
          otp_salt: string | null
          phone: string
          purpose: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number
          order_id?: string | null
          otp_hash: string
          otp_salt?: string | null
          phone: string
          purpose?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          order_id?: string | null
          otp_hash?: string
          otp_salt?: string | null
          phone?: string
          purpose?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_otp_verifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      customer_transaction_items: {
        Row: {
          admin_price_inc: number | null
          amount: number | null
          base_quantity: number | null
          base_unit: string | null
          calculated_amount: number | null
          created_at: string
          entered_quantity: number | null
          entered_unit: string | null
          final_sale_amount: number | null
          id: string
          inventory_id: string | null
          product: string
          product_id: string | null
          product_variant_id: string | null
          purchase_cost: number | null
          purchase_cost_per_base_unit: number | null
          quantity: number
          rate: number
          selling_rate_per_base_unit: number | null
          transaction_id: string
          unit: string
        }
        Insert: {
          admin_price_inc?: number | null
          amount?: number | null
          base_quantity?: number | null
          base_unit?: string | null
          calculated_amount?: number | null
          created_at?: string
          entered_quantity?: number | null
          entered_unit?: string | null
          final_sale_amount?: number | null
          id?: string
          inventory_id?: string | null
          product: string
          product_id?: string | null
          product_variant_id?: string | null
          purchase_cost?: number | null
          purchase_cost_per_base_unit?: number | null
          quantity: number
          rate?: number
          selling_rate_per_base_unit?: number | null
          transaction_id: string
          unit?: string
        }
        Update: {
          admin_price_inc?: number | null
          amount?: number | null
          base_quantity?: number | null
          base_unit?: string | null
          calculated_amount?: number | null
          created_at?: string
          entered_quantity?: number | null
          entered_unit?: string | null
          final_sale_amount?: number | null
          id?: string
          inventory_id?: string | null
          product?: string
          product_id?: string | null
          product_variant_id?: string | null
          purchase_cost?: number | null
          purchase_cost_per_base_unit?: number | null
          quantity?: number
          rate?: number
          selling_rate_per_base_unit?: number | null
          transaction_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transaction_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transaction_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "customer_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          discount_amount: number
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
          subtotal: number
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          discount_amount?: number
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
          subtotal?: number
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          discount_amount?: number
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
          subtotal?: number
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
      idempotency_log: {
        Row: {
          created_at: string
          id: string
          key: string
          operation: string
          result: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          operation: string
          result: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          operation?: string
          result?: Json
        }
        Relationships: []
      }
      interest_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_type: string
          agreement_id: string
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          interest_delta: number
          principal_delta: number
          reason: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_type: string
          agreement_id: string
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          interest_delta?: number
          principal_delta?: number
          reason: string
        }
        Update: {
          adjustment_date?: string
          adjustment_type?: string
          agreement_id?: string
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          interest_delta?: number
          principal_delta?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "interest_adjustments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "interest_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_agreement_rate_history: {
        Row: {
          agreement_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          interest_rate: number
          rate_period: string
          reason: string | null
        }
        Insert: {
          agreement_id: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          interest_rate: number
          rate_period: string
          reason?: string | null
        }
        Update: {
          agreement_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          interest_rate?: number
          rate_period?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interest_agreement_rate_history_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "interest_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_agreements: {
        Row: {
          agreement_type: string
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          idempotency_key: string | null
          interest_rate: number
          interest_start_date: string
          loan_id: string | null
          method: string
          notes: string | null
          original_principal: number
          outstanding_principal: number
          rate_period: string
          source_transaction_id: string | null
          status: string
          terms_confirmed: boolean
          updated_at: string
        }
        Insert: {
          agreement_type: string
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          idempotency_key?: string | null
          interest_rate: number
          interest_start_date?: string
          loan_id?: string | null
          method?: string
          notes?: string | null
          original_principal: number
          outstanding_principal: number
          rate_period?: string
          source_transaction_id?: string | null
          status?: string
          terms_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          agreement_type?: string
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          idempotency_key?: string | null
          interest_rate?: number
          interest_start_date?: string
          loan_id?: string | null
          method?: string
          notes?: string | null
          original_principal?: number
          outstanding_principal?: number
          rate_period?: string
          source_transaction_id?: string | null
          status?: string
          terms_confirmed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interest_agreements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_agreements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_agreements_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "customer_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_payments: {
        Row: {
          adjustment_portion: number
          agreement_id: string
          amount: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          interest_portion: number
          ledger_transaction_id: string | null
          method: string
          notes: string | null
          payment_date: string
          principal_portion: number
          reference: string | null
        }
        Insert: {
          adjustment_portion?: number
          agreement_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          interest_portion?: number
          ledger_transaction_id?: string | null
          method?: string
          notes?: string | null
          payment_date?: string
          principal_portion?: number
          reference?: string | null
        }
        Update: {
          adjustment_portion?: number
          agreement_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          interest_portion?: number
          ledger_transaction_id?: string | null
          method?: string
          notes?: string | null
          payment_date?: string
          principal_portion?: number
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interest_payments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "interest_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: false
            referencedRelation: "customer_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          allow_loose_sale: boolean
          created_at: string
          id: string
          last_updated: string
          legacy_id: string | null
          min_stock_level: number
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          purchase_price: number
          quantity: number
          quantity_per_product: number | null
          selling_price: number | null
          session_id: string | null
          status: string
          supplier_id: string | null
          supplier_name: string
          total_price: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          allow_loose_sale?: boolean
          created_at?: string
          id?: string
          last_updated?: string
          legacy_id?: string | null
          min_stock_level?: number
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          purchase_price?: number
          quantity?: number
          quantity_per_product?: number | null
          selling_price?: number | null
          session_id?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_price?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          allow_loose_sale?: boolean
          created_at?: string
          id?: string
          last_updated?: string
          legacy_id?: string | null
          min_stock_level?: number
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          purchase_price?: number
          quantity?: number
          quantity_per_product?: number | null
          selling_price?: number | null
          session_id?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_price?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "supplier_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          disbursement_date: string
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_method: string
          payment_reference: string | null
          principal_disbursed: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          disbursement_date?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          principal_disbursed: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          disbursement_date?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          principal_disbursed?: number
        }
        Relationships: [
          {
            foreignKeyName: "loans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          product_variant_id: string | null
          purchase_cost: number | null
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
          product_variant_id?: string | null
          purchase_cost?: number | null
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
          product_variant_id?: string | null
          purchase_cost?: number | null
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
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
          delivery_address: string
          delivery_status: string
          discount: number
          id: string
          invoice_status: string
          mobile: string
          order_status: string
          package_sent_on: string | null
          paid: number
          payment_due_on: string | null
          payment_method: string
          payment_status: string
          pincode: string
          placed_on: string
          remarks: string | null
          subtotal: number
          tax: number
          timeline: Json
          total: number
          updated_at: string
          village: string
          whatsapp_notified_at: string | null
        }
        Insert: {
          channel?: string
          code: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_type?: string
          delivery_address?: string
          delivery_status?: string
          discount?: number
          id?: string
          invoice_status?: string
          mobile?: string
          order_status?: string
          package_sent_on?: string | null
          paid?: number
          payment_due_on?: string | null
          payment_method?: string
          payment_status?: string
          pincode?: string
          placed_on?: string
          remarks?: string | null
          subtotal?: number
          tax?: number
          timeline?: Json
          total?: number
          updated_at?: string
          village?: string
          whatsapp_notified_at?: string | null
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_type?: string
          delivery_address?: string
          delivery_status?: string
          discount?: number
          id?: string
          invoice_status?: string
          mobile?: string
          order_status?: string
          package_sent_on?: string | null
          paid?: number
          payment_due_on?: string | null
          payment_method?: string
          payment_status?: string
          pincode?: string
          placed_on?: string
          remarks?: string | null
          subtotal?: number
          tax?: number
          timeline?: Json
          total?: number
          updated_at?: string
          village?: string
          whatsapp_notified_at?: string | null
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
      product_variants: {
        Row: {
          base_stock: number
          created_at: string
          discount_price: number | null
          id: string
          inventory_id: string | null
          label: string
          product_id: string | null
          selling_price: number
          status: string
          stock: number
          updated_at: string
        }
        Insert: {
          base_stock?: number
          created_at?: string
          discount_price?: number | null
          id?: string
          inventory_id?: string | null
          label: string
          product_id?: string | null
          selling_price?: number
          status?: string
          stock?: number
          updated_at?: string
        }
        Update: {
          base_stock?: number
          created_at?: string
          discount_price?: number | null
          id?: string
          inventory_id?: string | null
          label?: string
          product_id?: string | null
          selling_price?: number
          status?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
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
          brand?: string | null
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
          brand?: string | null
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
      supplier_sessions: {
        Row: {
          created_at: string
          delivery_count: number
          id: string
          notes: string | null
          session_code: string
          session_date: string
          started_at: string
          status: string
          supplier_id: string
          total_advance: number
          total_due: number
          total_purchase: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_count?: number
          id?: string
          notes?: string | null
          session_code: string
          session_date?: string
          started_at?: string
          status?: string
          supplier_id: string
          total_advance?: number
          total_due?: number
          total_purchase?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_count?: number
          id?: string
          notes?: string | null
          session_code?: string
          session_date?: string
          started_at?: string
          status?: string
          supplier_id?: string
          total_advance?: number
          total_due?: number
          total_purchase?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_sessions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transactions: {
        Row: {
          amount: number
          balance: number
          created_at: string
          entry_date: string
          entry_type: string
          id: string
          inventory_item_id: string | null
          method: string
          product_name: string
          quantity: number
          rate: number
          reference: string
          remarks: string | null
          session_id: string | null
          supplier_id: string
          unit: string
        }
        Insert: {
          amount?: number
          balance?: number
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          inventory_item_id?: string | null
          method?: string
          product_name?: string
          quantity?: number
          rate?: number
          reference?: string
          remarks?: string | null
          session_id?: string | null
          supplier_id: string
          unit?: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          inventory_item_id?: string | null
          method?: string
          product_name?: string
          quantity?: number
          rate?: number
          reference?: string
          remarks?: string | null
          session_id?: string | null
          supplier_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "supplier_sessions"
            referencedColumns: ["id"]
          },
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
      testimonials: {
        Row: {
          content: string | null
          created_at: string
          crop: string
          enabled: boolean
          farm_name: string | null
          farmer_name: string | null
          id: string
          image_url: string | null
          location: string
          name: string
          quote: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          content?: string | null
          created_at?: string
          crop?: string
          enabled?: boolean
          farm_name?: string | null
          farmer_name?: string | null
          id?: string
          image_url?: string | null
          location?: string
          name: string
          quote: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          content?: string | null
          created_at?: string
          crop?: string
          enabled?: boolean
          farm_name?: string | null
          farmer_name?: string | null
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          quote?: string
          updated_at?: string
          verified?: boolean
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
      accrue_interest_to_date: {
        Args: { _agreement_id: string; _as_of?: string }
        Returns: {
          accrued_interest_total: number
          interest_outstanding: number
          interest_paid_total: number
          interest_waived_total: number
          principal_outstanding: number
          principal_paid_total: number
          principal_written_off_total: number
          total_settlement: number
        }[]
      }
      add_online_order_payment: {
        Args: {
          _amount: number
          _method: string
          _order_id: string
          _remarks?: string
        }
        Returns: {
          channel: string
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_type: string
          delivery_address: string
          delivery_status: string
          discount: number
          id: string
          invoice_status: string
          mobile: string
          order_status: string
          package_sent_on: string | null
          paid: number
          payment_due_on: string | null
          payment_method: string
          payment_status: string
          pincode: string
          placed_on: string
          remarks: string | null
          subtotal: number
          tax: number
          timeline: Json
          total: number
          updated_at: string
          village: string
          whatsapp_notified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      aggregate_most_sold_products: {
        Args: { _date_from?: string; _date_to?: string; _limit?: number }
        Returns: {
          product: string
          total_amount: number
          total_quantity: number
          transaction_count: number
        }[]
      }
      cleanup_expired_checkout_otps: { Args: never; Returns: number }
      cleanup_expired_zero_stock_inventory: { Args: never; Returns: number }
      convert_unit_quantity: {
        Args: { _from_unit: string; _quantity: number; _to_unit: string }
        Returns: number
      }
      create_customer_order: {
        Args: {
          _customer_id?: string
          _customer_name?: string
          _delivery_address?: string
          _items: Json
          _mobile?: string
          _payment_method?: string
          _remarks?: string
          _village?: string
        }
        Returns: string
      }
      create_direct_loan: {
        Args: {
          _customer_id: string
          _disbursement_date?: string
          _idempotency_key?: string
          _interest_rate: number
          _interest_start_date?: string
          _notes?: string
          _payment_method?: string
          _payment_reference?: string
          _principal: number
          _rate_period?: string
        }
        Returns: string
      }
      create_khata_sale: {
        Args: {
          _customer_id: string
          _entry_date?: string
          _items: Json
          _method?: string
          _paid?: number
          _remarks?: string
        }
        Returns: string
      }
      create_khata_sale_with_bargaining: {
        Args: {
          _bargaining_amount?: number
          _customer_id: string
          _entry_date?: string
          _items: Json
          _method?: string
          _paid?: number
          _remarks?: string
        }
        Returns: string
      }
      create_khata_sale_with_interest: {
        Args: {
          _bargaining_amount?: number
          _customer_id: string
          _entry_date?: string
          _idempotency_key?: string
          _interest_settings?: Json
          _items: Json
          _method?: string
          _paid?: number
          _remarks?: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hook_before_user_created_rate_limit: {
        Args: { event: Json }
        Returns: Json
      }
      hook_password_verification_attempt: {
        Args: { event: Json }
        Returns: Json
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      load_active_interest_agreements: {
        Args: {
          _date_from?: string
          _date_to?: string
          _page?: number
          _page_size?: number
          _search?: string
          _village?: string
        }
        Returns: {
          agreement_id: string
          agreement_type: string
          customer_id: string
          customer_mobile: string
          customer_name: string
          customer_village: string
          interest_outstanding: number
          interest_rate: number
          interest_start_date: string
          original_principal: number
          outstanding_principal: number
          rate_period: string
          status: string
          total_settlement: number
        }[]
      }
      load_active_interest_agreements_v2: {
        Args: {
          _date_from?: string
          _date_to?: string
          _page?: number
          _page_size?: number
          _search?: string
          _village?: string
        }
        Returns: {
          agreement_id: string
          agreement_type: string
          customer_id: string
          customer_mobile: string
          customer_name: string
          customer_village: string
          interest_outstanding: number
          interest_rate: number
          interest_start_date: string
          original_principal: number
          outstanding_principal: number
          rate_period: string
          status: string
          total_count: number
          total_settlement: number
        }[]
      }
      load_customer_interest_agreements: {
        Args: { _customer_id: string }
        Returns: {
          agreement_id: string
          agreement_type: string
          created_at: string
          interest_outstanding: number
          interest_paid_total: number
          interest_rate: number
          interest_start_date: string
          loan_id: string
          notes: string
          original_principal: number
          outstanding_principal: number
          principal_paid_total: number
          rate_period: string
          source_transaction_id: string
          status: string
          total_settlement: number
        }[]
      }
      normalize_inventory_unit: { Args: { _unit: string }; Returns: string }
      place_cod_order: {
        Args: {
          _address: string
          _customer_name: string
          _idempotency_key?: string
          _items: Json
          _mobile: string
          _pincode: string
          _remarks?: string
          _village: string
        }
        Returns: {
          order_code: string
          order_id: string
          order_total: number
        }[]
      }
      publish_inventory_product: {
        Args: {
          _category?: string
          _description?: string
          _discount_price?: number
          _emoji?: string
          _existing_product_id?: string
          _featured?: boolean
          _images?: string[]
          _inventory_id: string
          _selling_price?: number
          _tags?: string[]
          _title?: string
          _visibility?: string
        }
        Returns: string
      }
      purge_idempotency_log: { Args: never; Returns: number }
      recalc_customer_balance: {
        Args: { _customer_id: string }
        Returns: undefined
      }
      record_customer_product_return: {
        Args: {
          _customer_id: string
          _entry_date?: string
          _items: Json
          _remarks?: string
        }
        Returns: Json
      }
      record_interest_adjustment: {
        Args: {
          _adjustment_date?: string
          _adjustment_type: string
          _agreement_id: string
          _idempotency_key?: string
          _interest_delta?: number
          _principal_delta?: number
          _reason: string
        }
        Returns: string
      }
      record_interest_payment: {
        Args: {
          _agreement_id: string
          _allocation?: Json
          _amount: number
          _entry_date?: string
          _idempotency_key?: string
          _method?: string
          _notes?: string
          _reference?: string
        }
        Returns: string
      }
      record_inventory_lot_purchase:
        | {
            Args: {
              _advance_method?: string
              _advance_paid?: number
              _allow_loose_sale?: boolean
              _entry_date?: string
              _min_stock_level?: number
              _product_name: string
              _purchase_price_per_unit: number
              _quantity: number
              _reference_selling_price_per_unit?: number
              _supplier_id: string
              _unit: string
            }
            Returns: string
          }
        | {
            Args: {
              _advance_method: string
              _advance_paid: number
              _allow_loose_sale: boolean
              _entry_date: string
              _min_stock_level: number
              _product_name: string
              _purchase_price_per_unit: number
              _quantity: number
              _quantity_per_product: number
              _reference_selling_price_per_unit: number
              _supplier_id: string
              _unit: string
            }
            Returns: string
          }
      record_khata_payment: {
        Args: {
          _amount: number
          _customer_id: string
          _entry_date?: string
          _method?: string
          _remarks?: string
        }
        Returns: string
      }
      record_supplier_payment: {
        Args: {
          _amount: number
          _entry_date?: string
          _method: string
          _reference?: string
          _remarks?: string
          _supplier_id: string
        }
        Returns: string
      }
      record_supplier_purchase_session: {
        Args: {
          _advance_method?: string
          _advance_paid?: number
          _deliveries: Json
          _entry_date?: string
          _notes?: string
          _started_at?: string
          _supplier_id: string
        }
        Returns: string
      }
      reserve_checkout_otp: {
        Args: {
          _expires_at: string
          _otp_hash: string
          _otp_salt: string
          _phone: string
          _user_id: string
        }
        Returns: {
          allowed: boolean
          otp_id: string
          reason: string
        }[]
      }
      revise_interest_rate: {
        Args: {
          _agreement_id: string
          _effective_date?: string
          _idempotency_key?: string
          _new_rate: number
          _new_rate_period: string
          _reason: string
        }
        Returns: string
      }
      search_product_sales: {
        Args: {
          _date_from?: string
          _date_to?: string
          _page?: number
          _page_size?: number
          _product?: string
          _quantity?: number
          _rate?: number
          _sort_by?: string
          _sort_dir?: string
        }
        Returns: {
          customer_id: string
          customer_mobile: string
          customer_name: string
          customer_village: string
          entry_date: string
          item_amount: number
          item_id: string
          product: string
          quantity: number
          rate: number
          total_count: number
          transaction_amount: number
          transaction_id: string
          transaction_payment: number
          transaction_remaining_due: number
          transaction_remarks: string
          unit: string
        }[]
      }
      settle_interest_agreement: {
        Args: {
          _agreement_id: string
          _idempotency_key?: string
          _reason?: string
          _settlement_date?: string
        }
        Returns: boolean
      }
      upsert_product_variant: {
        Args: {
          _discount_price?: number
          _inventory_id: string
          _label?: string
          _product_id?: string
          _selling_price?: number
        }
        Returns: string
      }
      verify_checkout_otp_atomic: {
        Args: {
          _otp_hash: string
          _otp_id: string
          _phone: string
          _user_id: string
        }
        Returns: {
          ok: boolean
          reason: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
