-- One customer_transactions row = one sale (or one payment) header.
-- This table lets a single sale contain multiple products.
CREATE TABLE public.customer_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.customer_transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product text NOT NULL,
  quantity numeric(12,2) NOT NULL,
  unit text NOT NULL DEFAULT 'unit',
  rate numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_transaction_items_qty_positive CHECK (quantity > 0),
  CONSTRAINT customer_transaction_items_rate_nonneg CHECK (rate >= 0)
);
CREATE INDEX customer_transaction_items_tx_idx ON public.customer_transaction_items (transaction_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_transaction_items TO authenticated;
GRANT ALL ON public.customer_transaction_items TO service_role;
ALTER TABLE public.customer_transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cti_staff" ON public.customer_transaction_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "cti_own_read" ON public.customer_transaction_items FOR SELECT TO authenticated
  USING (
    transaction_id IN (
      SELECT ct.id FROM public.customer_transactions ct
      JOIN public.customers c ON c.id = ct.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Defense-in-depth: stock can never go negative
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_quantity_nonneg CHECK (quantity >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_stock_nonneg CHECK (stock >= 0);

-- Slightly better auto-generated payment remarks
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
             COALESCE(NEW.remarks, CASE WHEN NEW.entry_type = 'payment' THEN 'Khata repayment' ELSE 'Advance received with credit sale' END)
      FROM public.customers c WHERE c.id = cid;
    END IF;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.customer_tx_after() FROM PUBLIC, anon, authenticated;

-- RPC: create a multi-item khata sale atomically
CREATE OR REPLACE FUNCTION public.create_khata_sale(
  _customer_id uuid,
  _items jsonb,
  _paid numeric DEFAULT 0,
  _method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,
  _remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_product_name text;
  v_qty numeric;
  v_rate numeric;
  v_unit text;
  v_inventory_id uuid;
  v_available numeric;
  v_total numeric := 0;
  v_item_count int := 0;
  v_tx_id uuid;
  v_summary text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;
  IF _paid IS NULL OR _paid < 0 THEN
    RAISE EXCEPTION 'Paid amount cannot be negative';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_rate := COALESCE((v_item->>'rate')::numeric, 0);
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name; END IF;
    IF v_rate < 0 THEN RAISE EXCEPTION 'Selling price cannot be negative for %', v_product_name; END IF;

    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    IF v_product_id IS NOT NULL THEN
      SELECT p.inventory_id INTO v_inventory_id FROM public.products p WHERE p.id = v_product_id;
      IF v_inventory_id IS NOT NULL THEN
        SELECT quantity INTO v_available FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;
        IF v_available IS NULL OR v_available < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, COALESCE(v_available,0), v_qty;
        END IF;
      ELSE
        SELECT stock INTO v_available FROM public.products WHERE id = v_product_id FOR UPDATE;
        IF v_available IS NULL OR v_available < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, COALESCE(v_available,0), v_qty;
        END IF;
      END IF;
    END IF;

    v_total := v_total + (v_qty * v_rate);
    v_item_count := v_item_count + 1;
  END LOOP;

  IF _paid > v_total THEN
    RAISE EXCEPTION 'Paid amount (%) cannot exceed sale total (%)', _paid, v_total;
  END IF;

  SELECT COALESCE(NULLIF(x->>'product',''), 'Item') INTO v_summary
  FROM jsonb_array_elements(_items) AS x LIMIT 1;
  IF v_item_count > 1 THEN
    v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more';
  END IF;

  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, amount, payment, method, remarks)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'purchase', v_summary, v_item_count, v_total, _paid, COALESCE(_method,'cash'), _remarks)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_unit := COALESCE(NULLIF(v_item->>'unit',''), 'unit');
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;

    INSERT INTO public.customer_transaction_items
      (transaction_id, product_id, product, quantity, unit, rate)
    VALUES
      (v_tx_id, v_product_id, v_product_name, v_qty, v_unit, v_rate);

    IF v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id = v_product_id;
      IF v_inventory_id IS NOT NULL THEN
        UPDATE public.inventory_items SET quantity = quantity - v_qty, last_updated = current_date WHERE id = v_inventory_id;
      ELSE
        UPDATE public.products SET stock = stock - v_qty WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) TO authenticated;

-- RPC: record a khata payment (never touches inventory)
CREATE OR REPLACE FUNCTION public.record_khata_payment(
  _customer_id uuid,
  _amount numeric,
  _method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,
  _remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tx_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, amount, payment, method, remarks)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'payment', 'Payment received', 0, 0, _amount, COALESCE(_method,'cash'), _remarks)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_khata_payment(uuid, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_khata_payment(uuid, numeric, text, date, text) TO authenticated;
