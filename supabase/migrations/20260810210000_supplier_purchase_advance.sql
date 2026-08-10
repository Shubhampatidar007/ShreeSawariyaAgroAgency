-- Replace the existing 7-argument function with the
-- new version that supports an advance payment.

DROP FUNCTION IF EXISTS public.record_supplier_purchase(
  uuid,
  text,
  numeric,
  text,
  numeric,
  numeric,
  date
);

CREATE OR REPLACE FUNCTION public.record_supplier_purchase(
  _supplier_id uuid,
  _product_name text,
  _quantity numeric,
  _unit text,
  _purchase_price numeric,
  _min_stock_level numeric DEFAULT 0,
  _entry_date date DEFAULT CURRENT_DATE,
  _advance_paid numeric DEFAULT 0,
  _advance_method text DEFAULT 'cash'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inventory_id uuid;
  v_supplier_name text;
  v_total numeric;
  v_advance numeric;
  v_new_due numeric;
BEGIN

  -- Security
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Validation
  IF _quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF _purchase_price < 0 THEN
    RAISE EXCEPTION 'Purchase price cannot be negative';
  END IF;

  IF COALESCE(trim(_product_name), '') = '' THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;

  IF COALESCE(trim(_unit), '') = '' THEN
    RAISE EXCEPTION 'Unit is required';
  END IF;

  -- Normalize advance
  v_advance := GREATEST(COALESCE(_advance_paid, 0), 0);

  -- Get supplier and lock row
  SELECT company
  INTO v_supplier_name
  FROM public.suppliers
  WHERE id = _supplier_id
  FOR UPDATE;

  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  -- Total purchase value
  v_total := _quantity * _purchase_price;

  -- Advance cannot be greater than purchase value
  IF v_advance > v_total THEN
    RAISE EXCEPTION
      'Advance paid cannot exceed purchase total';
  END IF;

  -- Validate payment method
  IF _advance_method NOT IN ('cash', 'upi', 'bank', 'cheque') THEN
    RAISE EXCEPTION 'Invalid advance payment method';
  END IF;


  ----------------------------------------------------------------
  -- 1. CREATE INVENTORY ITEM
  ----------------------------------------------------------------

  INSERT INTO public.inventory_items (
    product_name,
    supplier_id,
    supplier_name,
    quantity,
    unit,
    purchase_price,
    min_stock_level,
    status,
    last_updated
  )
  VALUES (
    _product_name,
    _supplier_id,
    v_supplier_name,
    _quantity,
    _unit,
    _purchase_price,
    COALESCE(_min_stock_level, 0),
    CASE
      WHEN _quantity <= 0 THEN 'out-of-stock'
      ELSE 'in-stock'
    END,
    COALESCE(_entry_date, current_date)
  )
  RETURNING id
  INTO v_inventory_id;


  ----------------------------------------------------------------
  -- 2. UPDATE SUPPLIER SUMMARY
  ----------------------------------------------------------------

  UPDATE public.suppliers
  SET
    total_purchases = total_purchases + v_total,

    -- Advance is already paid, so only the remaining
    -- amount becomes due.
    due_balance = due_balance + v_total - v_advance,

    -- Record the money already paid to supplier.
    total_paid = total_paid + v_advance,

    last_order = COALESCE(_entry_date, current_date),

    updated_at = now()

  WHERE id = _supplier_id

  RETURNING due_balance
  INTO v_new_due;


  ----------------------------------------------------------------
  -- 3. RECORD PURCHASE IN SUPPLIER LEDGER
  ----------------------------------------------------------------

  INSERT INTO public.supplier_transactions (
    supplier_id,
    entry_date,
    entry_type,
    reference,
    amount,
    balance,
    method,
    remarks,
    inventory_item_id,
    product_name,
    quantity,
    unit,
    rate
  )
  VALUES (
    _supplier_id,
    COALESCE(_entry_date, current_date),
    'purchase',
    _product_name,
    v_total,
    v_new_due,
    'credit',
    NULL,
    v_inventory_id,
    _product_name,
    _quantity,
    _unit,
    _purchase_price
  );


  ----------------------------------------------------------------
  -- 4. RECORD ADVANCE PAYMENT SEPARATELY
  ----------------------------------------------------------------

  IF v_advance > 0 THEN

    INSERT INTO public.supplier_transactions (
      supplier_id,
      entry_date,
      entry_type,
      reference,
      amount,
      balance,
      method,
      remarks,
      inventory_item_id,
      product_name,
      quantity,
      unit,
      rate
    )
    VALUES (
      _supplier_id,
      COALESCE(_entry_date, current_date),
      'advance',
      'ADV-' || LEFT(v_inventory_id::text, 8),
      v_advance,
      v_new_due,
      _advance_method,
      'Advance paid against inventory purchase',
      v_inventory_id,
      _product_name,
      _quantity,
      _unit,
      _purchase_price
    );

  END IF;


  RETURN v_inventory_id;

END;
$function$;