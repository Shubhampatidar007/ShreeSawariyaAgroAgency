CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  _supplier_id uuid,
  _amount numeric,
  _method text,
  _entry_date date DEFAULT CURRENT_DATE,
  _reference text DEFAULT '',
  _remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_name text;
  v_current_due numeric;
  v_new_due numeric;
  v_transaction_id uuid;
BEGIN

  ------------------------------------------------------------
  -- SECURITY
  ------------------------------------------------------------

  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;


  ------------------------------------------------------------
  -- VALIDATION
  ------------------------------------------------------------

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF _method NOT IN ('cash', 'upi', 'bank', 'cheque') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;


  ------------------------------------------------------------
  -- LOCK SUPPLIER
  ------------------------------------------------------------

  SELECT
    company,
    COALESCE(due_balance, 0)
  INTO
    v_supplier_name,
    v_current_due
  FROM public.suppliers
  WHERE id = _supplier_id
  FOR UPDATE;

  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;


  ------------------------------------------------------------
  -- DON'T ALLOW OVERPAYMENT
  ------------------------------------------------------------

  IF _amount > v_current_due THEN
    RAISE EXCEPTION
      'Payment cannot exceed current supplier due of %',
      v_current_due;
  END IF;


  v_new_due := v_current_due - _amount;


  ------------------------------------------------------------
  -- UPDATE SUPPLIER SUMMARY
  ------------------------------------------------------------

  UPDATE public.suppliers
  SET
    total_paid = total_paid + _amount,
    due_balance = v_new_due,
    updated_at = now()
  WHERE id = _supplier_id;


  ------------------------------------------------------------
  -- SUPPLIER LEDGER
  ------------------------------------------------------------

  INSERT INTO public.supplier_transactions (
    supplier_id,
    entry_date,
    entry_type,
    reference,
    amount,
    balance,
    method,
    remarks
  )
  VALUES (
    _supplier_id,
    COALESCE(_entry_date, CURRENT_DATE),
    'payment',
    COALESCE(NULLIF(trim(_reference), ''), 'Supplier payment'),
    _amount,
    v_new_due,
    _method,
    _remarks
  )
  RETURNING id
  INTO v_transaction_id;


  ------------------------------------------------------------
  -- GENERIC PAYMENTS TABLE
  ------------------------------------------------------------

  INSERT INTO public.payments (
    reference,
    direction,
    party_id,
    party_name,
    entry_date,
    amount,
    method,
    status,
    remarks
  )
  VALUES (
    COALESCE(NULLIF(trim(_reference), ''), 'Supplier payment'),
    'outgoing',
    _supplier_id,
    v_supplier_name,
    COALESCE(_entry_date, CURRENT_DATE),
    _amount,
    _method,
    'success',
    _remarks
  );


  RETURN v_transaction_id;

END;
$function$;