# Database Migration Report

## 1. Purpose

This report documents the database structure used by the current Supabase-backed application so another AI can recreate the same database in a new Supabase project and wire the app to it.

Project type: Vite + React + TypeScript + TanStack Router + Supabase
Source of truth in this repository:

- supabase/migrations/20260808140946_91b40b0a-64e4-414b-994d-8af8aa7070db.sql
- supabase/migrations/20260808141128_ddb448f7-d880-43a7-9f83-f2b0cbcee97e.sql
- supabase/migrations/20260808141420_5dd68a5f-9905-4e85-a8d2-52209e179e94.sql
- supabase/migrations/20260809011234_ec79d8cd-cbda-4bf3-bfa1-cc6cb3db6c31.sql
- src/lib/shop-store.ts
- src/integrations/supabase/types.ts

## 2. Current Supabase connection details

The app currently targets this project:

- Project URL: https://yqaiffjxprmwerdoufke.supabase.co
- Project ID: yqaiffjxprmwerdoufke
- Publishable/anonymouse key is present in the environment file.

Important: use the service role key only in server-side code. Do not expose it to the browser.

## 3. Database architecture summary

The database is organized around three layers:

1. Auth and roles
   - Supabase Auth users
   - public.profiles and public.user_roles
2. Business data
   - Customers, suppliers, inventory, products, orders, payments, ledger transactions, reminders, CMS sections, announcements, logs, backups
3. Automation
   - Triggers, functions, policies, and RLS rules that keep balances, stock, reminders, and notifications in sync

## 4. Tables and schema overview

### 4.1 public.profiles

Purpose: Stores profile data for Supabase Auth users.
Columns:

- id uuid PK -> auth.users.id
- full_name text
- mobile text
- village text
- email text
- created_at timestamptz
- updated_at timestamptz
  Relations:
- FK to auth.users(id) with ON DELETE CASCADE
  Used by:
- auth bootstrap on new user creation
- user profile access

### 4.2 public.user_roles

Purpose: Stores app roles for users.
Columns:

- id uuid PK
- user_id uuid FK -> auth.users(id)
- role app_role enum
- created_at timestamptz
  Relations:
- user_id -> auth.users.id
  Used by:
- role-based access control
- public.has_role and public.is_staff

### 4.3 public.customers

Purpose: Stores farmer/customer master data and credit balance summary.
Columns:

- id uuid PK
- name text
- mobile text
- village text
- address text
- joined_on date
- credit_limit numeric
- credit_balance numeric
- total_purchases numeric
- total_paid numeric
- current_due numeric
- last_purchase date
- status text
- notes text
- user_id uuid FK -> auth.users(id)
- created_at timestamptz
- updated_at timestamptz
  Relations:
- user_id -> auth.users.id
- child rows in customer_transactions and orders
  Used by:
- customer list, detail pages, khata, credit balance panel

### 4.4 public.suppliers

Purpose: Stores supplier master data and summary balances.
Columns:

- id uuid PK
- name text
- company text
- mobile text
- email text
- gstin text
- address text
- products_supplied text[]
- total_purchases numeric
- total_paid numeric
- advance numeric
- due_balance numeric
- last_order date
- status text
- created_at timestamptz
- updated_at timestamptz
  Relations:
- parent for inventory_items and supplier_transactions
  Used by:
- supplier management and ledger pages

### 4.5 public.inventory_items

Purpose: Tracks stock items and links them to suppliers.
Columns:

- id uuid PK
- product_name text
- supplier_id uuid FK -> suppliers(id)
- supplier_name text
- quantity numeric
- unit text
- purchase_price numeric
- total_price numeric generated
- min_stock_level numeric
- status text
- last_updated date
- created_at timestamptz
- updated_at timestamptz
  Relations:
- supplier_id -> suppliers.id
- child rows in products via inventory_id
  Used by:
- inventory management, stock alerts, product publishing

### 4.6 public.products

Purpose: Public storefront products. Linked to inventory items.
Columns:

- id uuid PK
- inventory_id uuid FK -> inventory_items(id)
- title text
- category text
- selling_price numeric
- discount_price numeric
- stock numeric
- description text
- tags text[]
- images text[]
- emoji text
- visibility text
- featured boolean
- status text
- published_on date
- created_at timestamptz
- updated_at timestamptz
  Relations:
- inventory_id -> inventory_items.id
- child rows in order_items via product_id
  Used by:
- storefront pages, featured products, catalog, publish flow

### 4.7 public.customer_transactions

Purpose: Ledger entries for customer khata / credit tracking.
Columns:

- id uuid PK
- customer_id uuid FK -> customers(id)
- entry_date date
- entry_type text
- product text
- quantity numeric
- amount numeric
- payment numeric
- remaining_due numeric
- method text
- order_id uuid
- remarks text
- created_at timestamptz
  Relations:
- customer_id -> customers.id
- order_id is a business reference only, not a hard FK in the current schema
  Used by:
- khata pages, customer balance calculations, repayment entries

### 4.8 public.supplier_transactions

Purpose: Ledger entries for supplier balances and payments.
Columns:

- id uuid PK
- supplier_id uuid FK -> suppliers(id)
- entry_date date
- entry_type text
- reference text
- amount numeric
- balance numeric
- method text
- remarks text
- created_at timestamptz
  Relations:
- supplier_id -> suppliers.id
  Used by:
- supplier ledger and payables pages

### 4.9 public.orders

Purpose: Sales orders.
Columns:

- id uuid PK
- code text unique
- channel text
- customer_id uuid FK -> customers(id)
- customer_name text
- customer_type text
- village text
- mobile text
- placed_on timestamptz
- subtotal numeric
- discount numeric
- tax numeric
- total numeric
- paid numeric
- payment_method text
- payment_status text
- delivery_status text
- order_status text
- invoice_status text
- remarks text
- timeline jsonb
- created_at timestamptz
- updated_at timestamptz
  Relations:
- customer_id -> customers.id
- child rows in order_items
  Used by:
- sales pages, order management, order status workflows

### 4.10 public.order_items

Purpose: Line items within each order.
Columns:

- id uuid PK
- order_id uuid FK -> orders(id)
- product_id uuid FK -> products(id)
- product text
- quantity numeric
- unit text
- rate numeric
- amount numeric
- created_at timestamptz
  Relations:
- order_id -> orders.id
- product_id -> products.id
  Used by:
- order detail display and stock deduction logic

### 4.11 public.payments

Purpose: Cash flow records for incoming and outgoing payments.
Columns:

- id uuid PK
- reference text
- direction text
- party_id uuid
- party_name text
- entry_date date
- amount numeric
- method text
- status text
- order_code text
- remarks text
- created_at timestamptz
  Relations:
- none hard-linked to other tables in this schema
  Used by:
- payments pages and reconciliation

### 4.12 public.reminders

Purpose: Reminder jobs for customers or suppliers.
Columns:

- id uuid PK
- title text
- audience text
- target text
- filter_summary text
- schedule text
- channel text
- due_amount numeric
- status text
- next_run date
- message text
- kind text
- source_id uuid
- created_at timestamptz
- updated_at timestamptz
  Relations:
- source_id is a business reference and not strongly constrained by FK in the current schema
  Used by:
- reminder management, low-stock alerts, due follow-ups

### 4.13 public.reminder_logs

Purpose: Audit log for reminder deliveries.
Columns:

- id uuid PK
- reminder_title text
- recipient text
- channel text
- sent_at timestamptz
- delivery text
- retries integer
  Relations:
- none
  Used by:
- reminder delivery history

### 4.14 public.notifications

Purpose: In-app notifications.
Columns:

- id uuid PK
- title text
- body text
- type text
- link text
- is_read boolean
- source_id uuid
- created_at timestamptz
  Relations:
- none hard-linked in current schema
  Used by:
- low stock and general status notices

### 4.15 public.cms_sections

Purpose: CMS content blocks for storefront pages.
Columns:

- id uuid PK
- name text
- type text
- enabled boolean
- visibility text
- sort_order integer
- headline text
- body text
- scheduled_from date
- scheduled_to date
- image_label text
- created_at timestamptz
- updated_at timestamptz
  Relations:
- none
  Used by:
- homepage and storefront content management

### 4.16 public.activity_logs

Purpose: Activity audit log.
Columns:

- id uuid PK
- actor text
- action text
- entity text
- entity_id uuid
- detail text
- created_at timestamptz
  Relations:
- none
  Used by:
- admin activity history screen

### 4.17 public.advertisements

Purpose: Marketing placements for homepage or other sections.
Columns:

- id uuid PK
- title text
- placement text
- audience text
- status text
- starts_on date
- runs_until date
- impressions integer
- clicks integer
- created_at timestamptz
- updated_at timestamptz
  Relations:
- none
  Used by:
- admin advertisement management

### 4.18 public.security_logs

Purpose: Security-related event log.
Columns:

- id uuid PK
- event text
- account text
- ip text
- device text
- location text
- severity text
- status text
- created_at timestamptz
  Relations:
- none
  Used by:
- security logs screen

### 4.19 public.backups

Purpose: Backup metadata records.
Columns:

- id uuid PK
- name text
- type text
- size text
- destination text
- status text
- created_at timestamptz
  Relations:
- none
  Used by:
- backup management screen

## 5. Relationships graph

Primary relationships:

- auth.users -> public.profiles
- auth.users -> public.user_roles
- auth.users -> public.customers.user_id
- public.customers -> public.customer_transactions
- public.customers -> public.orders
- public.suppliers -> public.inventory_items
- public.suppliers -> public.supplier_transactions
- public.inventory_items -> public.products
- public.products -> public.order_items
- public.orders -> public.order_items

## 6. Functions and automation

### 6.1 public.has_role(_user_id, _role)

Purpose: Checks whether a user has a specific role.
Returns: boolean
Used by: access control

### 6.2 public.is_staff(_user_id)

Purpose: Checks if user is admin or staff.
Returns: boolean
Used by: RLS policies and admin UI access

### 6.3 public.handle_new_user()

Purpose: Creates a profile row and assigns an initial role for new Supabase Auth users.
Triggered by: auth.users insert trigger

### 6.4 public.touch_updated_at()

Purpose: Updates the updated_at timestamp for modified rows.
Used by: triggers on customers, suppliers, inventory_items, products, orders, reminders, cms_sections, advertisements

### 6.5 public.recalc_customer_balance(_customer_id)

Purpose: Recalculates totals and balances for a customer from customer_transactions.
Used by: customer_tx_after trigger

### 6.6 public.customer_tx_after()

Purpose: Recalculates customer balance after customer transaction changes and creates a payment row when a payment amount is supplied.
Triggered by: customer_transactions insert/update/delete

### 6.7 public.inventory_stock_watch()

Purpose: Keeps linked products.stock in sync and creates low-stock reminders and notifications.
Triggered by: inventory_items insert/update of quantity or min_stock_level

### 6.8 public.order_item_after()

Purpose: Reduces inventory quantity from linked inventory_items or product stock.
Triggered by: order_items insert

### 6.9 public.order_after_insert()

Purpose: Creates a customer transaction entry for a new order when the order belongs to a customer.
Triggered by: orders insert

## 7. Triggers

- on_auth_user_created
- t_customers_upd
- t_suppliers_upd
- t_inventory_upd
- t_products_upd
- t_orders_upd
- t_reminders_upd
- t_cms_upd
- t_ads_upd
- t_customer_tx
- t_inventory_stock_watch
- t_order_item
- t_order_insert

## 8. Row Level Security and policies

The schema allows:

- Public storefront read access to published products and enabled CMS sections
- Authenticated staff/admin users to manage most business tables
- Authenticated users to read their own profile and own customer order data when linked by customer.user_id

Important policies:

- products_public_read
- cms_public_read
- customers_staff
- suppliers_staff
- inventory_staff
- products_staff
- ctx_staff
- stx_staff
- orders_staff
- order_items_staff
- payments_staff
- reminders_staff
- reminder_logs_staff
- notifications_staff
- cms_staff
- activity_staff
- orders_own_read
- ctx_own_read

## 9. How the app uses the database

The main frontend state layer is src/lib/shop-store.ts. It reads and writes these tables directly:

- customers
- suppliers
- inventory_items
- products
- customer_transactions
- supplier_transactions
- orders
- order_items
- payments
- reminders
- reminder_logs
- cms_sections
- advertisements
- activity_logs
- security_logs
- backups

This means a new Supabase project must recreate the schema first, then the app can use it without code changes if the table names and columns remain compatible.

## 10. Reproduction checklist for a new Supabase project

1. Create a new Supabase project.
2. Apply the SQL migrations in order:
   - 20260808140946_91b40b0a-64e4-414b-994d-8af8aa7070db.sql
   - 20260808141128_ddb448f7-d880-43a7-9f83-f2b0cbcee97e.sql
   - 20260808141420_5dd68a5f-9905-4e85-a8d2-52209e179e94.sql
   - 20260809011234_ec79d8cd-cbda-4bf3-bfa1-cc6cb3db6c31.sql
3. Set the environment variables in the app to the new project URL and service role/anonymouse keys.
4. Create at least one admin user in Supabase Auth and assign the admin role in public.user_roles.
5. Optionally import any existing business data from the old database into the new tables.
6. Test CRUD flows for customers, suppliers, inventory, products, orders, payments, reminders, and CMS content.

## 11. Migration prompt for another AI

Use this prompt with another AI:

Create a Supabase database that matches the schema used by this app. Use the repository migrations and the app code as the source of truth. Recreate all tables, enums, functions, triggers, RLS policies, and relationships described in this report. Ensure the app can read and write the same tables with the existing code. Do not change the application contract unless necessary. Prioritize compatibility with the current table and column names.

## 12. Important migration notes

- The app expects the table names exactly as shown here.
- Keep the public schema names unchanged.
- Preserve uuid primary keys and foreign keys where possible.
- If you migrate data, make sure customer and supplier balances can be recalculated correctly after import.
- Keep RLS policies aligned with the current admin and public access rules.
- If a new project is used, the app should be deployed with the correct env values after migration.
