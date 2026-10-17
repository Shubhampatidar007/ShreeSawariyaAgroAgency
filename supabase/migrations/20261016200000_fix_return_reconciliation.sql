-- =====================================================================
-- Phase 5.11 — Fix return-reconciliation trigger ambiguity
-- =====================================================================
--
-- Problem: the original trigger (t_interest_agreement_return_reconcile,
-- from migration 20261016180000) matches a return to the customer's
-- MOST RECENT active sale agreement. That is wrong if the customer has
-- multiple interest-bearing sales — a return for sale A could reduce
-- the principal on sale B.
--
-- Fix: add an optional source_transaction_id column to customer_transactions.
-- The record_customer_product_return RPC accepts an optional
-- _source_transaction_id parameter and writes it. The trigger uses
-- this column to identify the exact sale the return is for. If the
-- column is NULL (legacy returns), the trigger does NOT match —
-- safer than guessing.
--
-- This is a backward-compatible change:
--   * The new column is nullable, default NULL.
--   * The updated record_customer_product_return keeps all existing
--     parameters, with the new _source_transaction_id at the end
--     (default NULL).
--   * The updated trigger handles both the new path (column set) and
--     the legacy path (column NULL → no match → no auto-waiver).
--
-- Idempotent: uses ALTER TABLE ADD COLUMN IF NOT EXISTS, DROP TRIGGER
-- IF EXISTS, CREATE OR REPLACE.

-- =====================================================================
-- Step 1: add the source_transaction_id column to customer_transactions
-- =====================================================================
ALTER TABLE public.customer_transactions
  ADD COLUMN IF NOT EXISTS source_transaction_id uuid
  REFERENCES public.customer_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customer_transactions_source_tx_idx
  ON public.customer_transactions (source_transaction_id)
  WHERE source_transaction_id IS NOT NULL;

-- =====================================================================
-- Step 2: update record_customer_product_return to accept the optional
-- _source_transaction_id parameter and write it to the new column.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_customer_product_return(
  _customer_id uuid,
  _items jsonb,
  _entry_date date DEFAULT current_date,
  _remarks text DEFAULT NULL,
  _source_transaction_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_inventory_id uuid;
  v_product_name text;
  v_qty numeric;
  v_price numeric;
  v_unit text;
  v_inventory_unit text;
  v_quantity_per_product numeric;
  v_total numeric := 0;
  v_item_count integer := 0;
  v_tx_id uuid;
  v_summary text;
  v_loose boolean;
  v_return_qty_in_inventory_unit numeric;
  v_source_tx_exists boolean;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one return item is required';
  END IF;

  -- If source_transaction_id is provided, verify it belongs to this customer
  -- and is a purchase/sale (not a payment or another return).
  IF _source_transaction_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.customer_transactions
       WHERE id = _source_transaction_id
         AND customer_id = _customer_id
         AND entry_type IN ('purchase', 'sale')
    ) INTO v_source_tx_exists;
    IF NOT v_source_tx_exists THEN
      RAISE EXCEPTION 'source_transaction_id % does not belong to this customer or is not a sale',
        _source_transaction_id;
    END IF;
  END IF;

  -- ===================================================================
  -- First pass: validate every return item, resolve identities, total.
  -- ===================================================================
  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    v_product_name := COALESCE(NULLIF(trim(v_item->>'product'), ''), 'Returned item');
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
    v_price := COALESCE(NULLIF(v_item->>'price', '')::numeric, 0);
    v_loose := COALESCE((v_item->>'loose')::boolean, false);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Return quantity must be greater than zero for %', v_product_name;
    END IF;
    IF v_price <= 0 THEN
      RAISE EXCEPTION 'Return price must be greater than zero for %', v_product_name;
    END IF;

    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id, inventory_id, label
      INTO v_product_id, v_inventory_id, v_unit
      FROM public.product_variants pv
      WHERE pv.id = v_variant_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product variant not found for %', v_product_name;
      END IF;
    END IF;

    IF v_product_id IS NULL AND v_inventory_id IS NOT NULL THEN
      SELECT p.id FROM public.products p WHERE p.inventory_id = v_inventory_id
      ORDER BY CASE WHEN p.status = 'published' THEN 0 ELSE 1 END, p.created_at
      LIMIT 1 INTO v_product_id FOR UPDATE;
    END IF;

    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT p.inventory_id FROM public.products p WHERE p.id = v_product_id
      INTO v_inventory_id FOR UPDATE;
    END IF;

    v_total := v_total + (v_qty * v_price);
    v_item_count := v_item_count + 1;
  END LOOP;

  SELECT COALESCE(NULLIF(x->>'product',''), 'Returned item') INTO v_summary
  FROM jsonb_array_elements(_items) AS x LIMIT 1;
  IF v_item_count > 1 THEN
    v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more';
  END IF;

  -- ===================================================================
  -- Insert the return row, including the new source_transaction_id
  -- when provided. The amount is negative (customer credit).
  -- ===================================================================
  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, subtotal, discount_amount,
     amount, payment, method, remarks, source_transaction_id)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'return', v_summary, v_item_count,
     v_total, 0, -v_total, 0, 'credit',
     COALESCE(_remarks, 'Customer product return'),
     _source_transaction_id)
  RETURNING id INTO v_tx_id;

  -- ===================================================================
  -- Second pass: restock each item (existing behavior, unchanged).
  -- ===================================================================
  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := (v_item->>'price')::numeric;
    v_unit := COALESCE(NULLIF(v_item->>'unit', ''), 'unit');
    v_loose := COALESCE((v_item->>'loose')::boolean, false);
    v_product_name := COALESCE(NULLIF(trim(v_item->>'product'), ''), 'Returned item');

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id, inventory_id INTO v_product_id, v_inventory_id
      FROM public.product_variants WHERE id = v_variant_id;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
         SET quantity = quantity + v_qty, last_updated = current_date
       WHERE id = v_inventory_id;
    ELSIF v_product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock + v_qty WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'total', v_total,
    'source_transaction_id', _source_transaction_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_customer_product_return(uuid, jsonb, date, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_product_return(uuid, jsonb, date, text, uuid) TO authenticated;

-- =====================================================================
-- Step 3: replace the reconciliation trigger to use the new column.
-- Drop the old trigger + function first (the function signature is
-- unchanged but the body needs updating).
-- =====================================================================
DROP TRIGGER IF EXISTS t_interest_agreement_return_reconcile ON public.customer_transactions;
DROP FUNCTION IF EXISTS public.interest_agreement_return_reconcile();

CREATE OR REPLACE FUNCTION public.interest_agreement_return_reconcile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement public.interest_agreements%ROWTYPE;
  v_sale_amount numeric(14,2);
  v_return_amount numeric(14,2);
  v_returned_principal numeric(14,2);
  v_return_ratio numeric;
  v_waiver_interest numeric(14,2);
BEGIN
  -- Only fires on new return rows.
  IF NEW.entry_type <> 'return' THEN
    RETURN NULL;
  END IF;

  -- If the return row has an explicit source_transaction_id, use it to
  -- find the EXACT interest agreement attached to that sale. This is the
  -- safe path — no ambiguity.
  IF NEW.source_transaction_id IS NOT NULL THEN
    SELECT * INTO v_agreement
      FROM public.interest_agreements
     WHERE source_transaction_id = NEW.source_transaction_id
       AND agreement_type = 'sale'
       AND status IN ('active', 'paused')
     LIMIT 1;
  ELSE
    -- Legacy path: no source reference on the return row. We cannot
    -- safely attribute this return to any specific agreement, so we do
    -- NOT auto-waive. The admin can manually record an adjustment via
    -- the InterestAdjustmentDialog (Phase 3 UI) if needed.
    RETURN NULL;
  END IF;

  IF NOT FOUND THEN
    -- The return is for a sale that has no interest agreement (e.g. an
    -- old sale from before the interest feature existed). Nothing to do.
    RETURN NULL;
  END IF;

  v_return_amount := ABS(NEW.amount);  -- return rows have negative amount
  v_sale_amount := v_agreement.original_principal;

  IF v_sale_amount <= 0 OR v_return_amount <= 0 THEN
    RETURN NULL;
  END IF;

  v_return_ratio := LEAST(v_return_amount / v_sale_amount, 1.0);
  v_returned_principal := v_agreement.original_principal * v_return_ratio;

  -- Reduce the agreement's outstanding principal by the returned portion.
  UPDATE public.interest_agreements
     SET outstanding_principal = GREATEST(outstanding_principal - v_returned_principal, 0)
   WHERE id = v_agreement.id;

  -- Record an auto-waiver for the interest that would have accrued on
  -- the returned principal from the agreement's start date through today.
  DECLARE
    v_annual_rate numeric;
  BEGIN
    IF v_agreement.rate_period = 'monthly' THEN
      v_annual_rate := v_agreement.interest_rate * 12;
    ELSE
      v_annual_rate := v_agreement.interest_rate;
    END IF;

    v_waiver_interest := v_returned_principal
      * (v_annual_rate / 100.0)
      * ((current_date - v_agreement.interest_start_date) / 365.0);

    INSERT INTO public.interest_adjustments (
      agreement_id, adjustment_date, adjustment_type,
      interest_delta, principal_delta, reason,
      approved_by, created_by
    ) VALUES (
      v_agreement.id, current_date, 'waiver',
      -ROUND(v_waiver_interest, 2),
      0,
      'Auto-waiver for returned principal (Rs ' || v_return_amount
        || ' returned on ' || NEW.entry_date
        || ' referencing sale ' || NEW.source_transaction_id || ')',
      auth.uid(), auth.uid()
    );
  END;

  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.interest_agreement_return_reconcile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER t_interest_agreement_return_reconcile
  AFTER INSERT ON public.customer_transactions
  FOR EACH ROW EXECUTE FUNCTION public.interest_agreement_return_reconcile();
