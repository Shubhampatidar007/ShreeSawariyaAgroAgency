
-- lock down helper functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  village text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  joined_on date NOT NULL DEFAULT current_date,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  credit_balance numeric(12,2) NOT NULL DEFAULT 0,
  total_purchases numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  current_due numeric(12,2) NOT NULL DEFAULT 0,
  last_purchase date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  products_supplied text[] NOT NULL DEFAULT '{}',
  total_purchases numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  advance numeric(12,2) NOT NULL DEFAULT 0,
  due_balance numeric(12,2) NOT NULL DEFAULT 0,
  last_order date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL DEFAULT '',
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unit',
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(14,2) GENERATED ALWAYS AS (quantity * purchase_price) STORED,
  min_stock_level numeric(12,2) NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'inventory-only',
  last_updated date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  discount_price numeric(12,2),
  stock numeric(12,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  emoji text NOT NULL DEFAULT '🌾',
  visibility text NOT NULL DEFAULT 'public',
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published',
  published_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  entry_type text NOT NULL DEFAULT 'purchase', -- purchase | payment | credit | adjustment
  product text NOT NULL DEFAULT '',
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment numeric(12,2) NOT NULL DEFAULT 0,
  remaining_due numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  order_id uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  entry_type text NOT NULL DEFAULT 'purchase',
  reference text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'offline',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_type text NOT NULL DEFAULT 'walk-in',
  village text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  placed_on timestamptz NOT NULL DEFAULT now(),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'pending',
  delivery_status text NOT NULL DEFAULT 'not-required',
  order_status text NOT NULL DEFAULT 'pending',
  invoice_status text NOT NULL DEFAULT 'generated',
  remarks text,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'unit',
  rate numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  direction text NOT NULL DEFAULT 'incoming',
  party_id uuid,
  party_name text NOT NULL DEFAULT '',
  entry_date date NOT NULL DEFAULT current_date,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'success',
  order_code text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audience text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT 'customer',
  filter_summary text NOT NULL DEFAULT '',
  schedule text NOT NULL DEFAULT 'daily',
  channel text NOT NULL DEFAULT 'sms',
  due_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  next_run date NOT NULL DEFAULT current_date,
  message text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'manual', -- manual | low-stock | due
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reminders_auto_source_idx ON public.reminders (kind, source_id) WHERE source_id IS NOT NULL;

CREATE TABLE public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_title text NOT NULL,
  recipient text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'sms',
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivery text NOT NULL DEFAULT 'delivered',
  retries integer NOT NULL DEFAULT 0
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'hero',
  enabled boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'public',
  sort_order integer NOT NULL DEFAULT 0,
  headline text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  scheduled_from date,
  scheduled_to date,
  image_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  entity text NOT NULL DEFAULT '',
  entity_id uuid,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers, public.suppliers, public.inventory_items,
  public.products, public.customer_transactions, public.supplier_transactions, public.orders,
  public.order_items, public.payments, public.reminders, public.reminder_logs, public.notifications,
  public.cms_sections, public.activity_logs TO authenticated;
GRANT ALL ON public.customers, public.suppliers, public.inventory_items, public.products,
  public.customer_transactions, public.supplier_transactions, public.orders, public.order_items,
  public.payments, public.reminders, public.reminder_logs, public.notifications,
  public.cms_sections, public.activity_logs TO service_role;
GRANT SELECT ON public.products, public.cms_sections TO anon;

-- ============ RLS ============
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- public storefront reads
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon
  USING (visibility = 'public' AND status = 'published');
CREATE POLICY "cms_public_read" ON public.cms_sections FOR SELECT TO anon
  USING (enabled AND visibility = 'public');

-- staff manage everything
CREATE POLICY "customers_staff" ON public.customers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "suppliers_staff" ON public.suppliers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "inventory_staff" ON public.inventory_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "products_staff" ON public.products FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "products_auth_read" ON public.products FOR SELECT TO authenticated
  USING (visibility = 'public' AND status = 'published');
CREATE POLICY "ctx_staff" ON public.customer_transactions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "stx_staff" ON public.supplier_transactions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "orders_staff" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "order_items_staff" ON public.order_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "payments_staff" ON public.payments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "reminders_staff" ON public.reminders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "reminder_logs_staff" ON public.reminder_logs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "notifications_staff" ON public.notifications FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cms_staff" ON public.cms_sections FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cms_auth_read" ON public.cms_sections FOR SELECT TO authenticated
  USING (enabled AND visibility = 'public');
CREATE POLICY "activity_staff" ON public.activity_logs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- customers can read their own orders / khata
CREATE POLICY "orders_own_read" ON public.orders FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "ctx_own_read" ON public.customer_transactions FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- ============ updated_at triggers ============
CREATE TRIGGER t_customers_upd BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_suppliers_upd BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_inventory_upd BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_orders_upd BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_reminders_upd BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_cms_upd BEFORE UPDATE ON public.cms_sections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CUSTOMER BALANCE AUTOMATION ============
CREATE OR REPLACE FUNCTION public.recalc_customer_balance(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p numeric; pay numeric; last_p date;
BEGIN
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(payment),0), MAX(entry_date) FILTER (WHERE amount > 0)
    INTO p, pay, last_p
  FROM public.customer_transactions WHERE customer_id = _customer_id;

  UPDATE public.customers
     SET total_purchases = p,
         total_paid = pay,
         current_due = GREATEST(p - pay, 0),
         credit_balance = GREATEST(p - pay, 0),
         last_purchase = COALESCE(last_p, last_purchase)
   WHERE id = _customer_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.recalc_customer_balance(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.customer_tx_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; running numeric;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  PERFORM public.recalc_customer_balance(cid);
  SELECT credit_balance INTO running FROM public.customers WHERE id = cid;
  IF TG_OP <> 'DELETE' THEN
    UPDATE public.customer_transactions SET remaining_due = running WHERE id = NEW.id AND remaining_due IS DISTINCT FROM running;
    IF NEW.payment > 0 THEN
      INSERT INTO public.payments (reference, direction, party_id, party_name, entry_date, amount, method, status, remarks)
      SELECT 'KH-' || substr(NEW.id::text,1,8), 'incoming', c.id, c.name, NEW.entry_date, NEW.payment, NEW.method, 'success',
             COALESCE(NEW.remarks, 'Khata repayment')
      FROM public.customers c WHERE c.id = cid;
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER t_customer_tx AFTER INSERT OR UPDATE OR DELETE ON public.customer_transactions
FOR EACH ROW EXECUTE FUNCTION public.customer_tx_after();

-- ============ LOW STOCK AUTOMATION ============
CREATE OR REPLACE FUNCTION public.inventory_stock_watch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- keep the linked storefront product stock in sync
  UPDATE public.products SET stock = NEW.quantity WHERE inventory_id = NEW.id;

  IF NEW.quantity <= NEW.min_stock_level THEN
    INSERT INTO public.reminders (title, audience, target, filter_summary, schedule, channel, due_amount, status, next_run, message, kind, source_id)
    VALUES (
      'Low stock: ' || NEW.product_name,
      'Shop owner', 'supplier',
      'Stock ' || NEW.quantity || ' ' || NEW.unit || ' at or below minimum ' || NEW.min_stock_level,
      'immediate', 'whatsapp', 0, 'active', current_date,
      'Reorder ' || NEW.product_name || ' from ' || COALESCE(NEW.supplier_name,'supplier') || '. Only ' || NEW.quantity || ' ' || NEW.unit || ' left.',
      'low-stock', NEW.id
    )
    ON CONFLICT (kind, source_id) WHERE source_id IS NOT NULL
    DO UPDATE SET status = 'active', next_run = current_date,
                  filter_summary = EXCLUDED.filter_summary, message = EXCLUDED.message, updated_at = now();

    INSERT INTO public.notifications (title, body, type, link, source_id)
    VALUES ('Low stock alert', NEW.product_name || ' is down to ' || NEW.quantity || ' ' || NEW.unit, 'warning', '/admin/inventory', NEW.id);
  ELSE
    UPDATE public.reminders SET status = 'completed', updated_at = now()
     WHERE kind = 'low-stock' AND source_id = NEW.id AND status = 'active';
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER t_inventory_stock_watch AFTER INSERT OR UPDATE OF quantity, min_stock_level ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.inventory_stock_watch();

-- ============ ORDER ITEM -> STOCK ============
CREATE OR REPLACE FUNCTION public.order_item_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv uuid;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT inventory_id INTO inv FROM public.products WHERE id = NEW.product_id;
    IF inv IS NOT NULL THEN
      UPDATE public.inventory_items
         SET quantity = GREATEST(quantity - NEW.quantity, 0), last_updated = current_date
       WHERE id = inv;
    ELSE
      UPDATE public.products SET stock = GREATEST(stock - NEW.quantity, 0) WHERE id = NEW.product_id;
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER t_order_item AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_item_after();

-- ============ ORDER -> KHATA ============
CREATE OR REPLACE FUNCTION public.order_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_transactions (customer_id, entry_date, entry_type, product, quantity, amount, payment, method, order_id, remarks)
    VALUES (NEW.customer_id, NEW.placed_on::date, 'purchase', 'Order ' || NEW.code, 1, NEW.total, NEW.paid, NEW.payment_method, NEW.id, NEW.remarks);
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER t_order_insert AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.order_after_insert();
