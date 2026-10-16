-- Phase 5.7 — Direct loan + payment + revise + adjust + settle RPCs

-- =====================================================================
-- create_direct_loan()
-- Creates a loans row + interest_agreements row (type='loan') + a
-- customer_transactions row of entry_type='loan_disbursement' so the
-- customer ledger reflects the loan. Does NOT touch inventory, products,
-- or sales totals.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_direct_loan(
  _customer_id uuid,
  _principal numeric(14,2),
  _disbursement_date date DEFAULT current_date,
  _interest_rate numeric(8,4),
  _rate_period text DEFAULT 'annual',
  _interest_start_date date DEFAULT current_date,
  _payment_method text DEFAULT 'cash',
  _payment_reference text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan_id uuid;
  v_agreement_id uuid;
  v_tx_id uuid;
  v_existing_result jsonb;
  v_method text := COALESCE(_payment_method, 'cash');
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF _principal IS NULL OR _principal <= 0 THEN
    RAISE EXCEPTION 'Principal must be greater than zero';
  END IF;
  IF _interest_rate IS NULL OR _interest_rate < 0 THEN
    RAISE EXCEPTION 'Invalid interest rate';
  END IF;
  IF _rate_period NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid rate_period';
  END IF;
  IF v_method NOT IN ('cash', 'upi', 'bank', 'cheque') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  -- Idempotency
  IF _idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing_result
      FROM public.idempotency_log
      WHERE key = _idempotency_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    IF FOUND THEN
      RETURN (v_existing_result->>'loan_id')::uuid;
    END IF;
  END IF;

  -- 1. Create the loan record.
  INSERT INTO public.loans (
    customer_id, principal_disbursed, disbursement_date,
    payment_method, payment_reference, notes,
    idempotency_key, created_by
  ) VALUES (
    _customer_id, _principal, COALESCE(_disbursement_date, current_date),
    v_method, _payment_reference, _notes,
    _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_loan_id;

  -- 2. Create the interest agreement (type='loan').
  INSERT INTO public.interest_agreements (
    customer_id, agreement_type, source_transaction_id, loan_id,
    original_principal, outstanding_principal,
    interest_rate, rate_period, interest_start_date,
    method, status, notes, terms_confirmed,
    idempotency_key, created_by
  ) VALUES (
    _customer_id, 'loan', NULL, v_loan_id,
    _principal, _principal,
    _interest_rate, _rate_period, COALESCE(_interest_start_date, current_date),
    'simple', 'active', _notes, true,
    _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_agreement_id;

  -- 3. Seed the rate history with the initial rate.
  INSERT INTO public.interest_agreement_rate_history (
    agreement_id, interest_rate, rate_period, effective_date,
    reason, created_by
  ) VALUES (
    v_agreement_id, _interest_rate, _rate_period,
    COALESCE(_interest_start_date, current_date),
    'Initial rate at loan creation', auth.uid()
  );

  -- 4. Create the customer_transactions row of entry_type='loan_disbursement'.
  -- This makes the loan visible in the customer ledger and feeds
  -- recalc_customer_balance so customers.current_due reflects the loan.
  -- amount=_principal, payment=0 (loan is owed in full).
  INSERT INTO public.customer_transactions (
    customer_id, entry_date, entry_type, product, quantity,
    amount, payment, method, remarks
  ) VALUES (
    _customer_id, COALESCE(_disbursement_date, current_date),
    'loan_disbursement', 'Direct loan', 1,
    _principal, 0, v_method,
    COALESCE(_payment_reference, _notes)
  )
  RETURNING id INTO v_tx_id;

  -- Idempotency: store result.
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_log (key, operation, result)
    VALUES (
      _idempotency_key,
      'create_direct_loan',
      jsonb_build_object(
        'loan_id', v_loan_id,
        'agreement_id', v_agreement_id,
        'transaction_id', v_tx_id
      )
    )
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_loan_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_direct_loan(uuid, numeric, date, numeric, text, date, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_loan(uuid, numeric, date, numeric, text, date, text, text, text, text) TO authenticated;

-- =====================================================================
-- record_interest_payment()
-- Records a payment against an interest agreement. Allocation:
--   * If _allocation is NULL: auto-allocate interest-first, then principal.
--   * If _allocation is provided: {interest_portion, principal_portion}
--     Both must be >= 0 and sum to _amount (adjustment_portion = amount -
--     interest - principal, can be 0).
-- Inserts BOTH an interest_payments row AND a customer_transactions row
-- of entry_type='payment' (or 'loan_repayment' for loan agreements).
-- Updates interest_agreements.outstanding_principal to reflect the
-- principal portion.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_interest_payment(
  _agreement_id uuid,
  _amount numeric(14,2),
  _method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,
  _allocation jsonb DEFAULT NULL,
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement public.interest_agreements%ROWTYPE;
  v_interest_portion numeric(14,2);
  v_principal_portion numeric(14,2);
  v_adjustment_portion numeric(14,2) := 0;
  v_ledger_tx_id uuid;
  v_payment_id uuid;
  v_existing_result jsonb;
  v_accrued numeric(14,2);
  v_interest_outstanding numeric(14,2);
  v_principal_outstanding numeric(14,2);
  v_entry_type text;
  v_method text := COALESCE(_method, 'cash');
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_agreement FROM public.interest_agreements WHERE id = _agreement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interest agreement not found';
  END IF;
  IF v_agreement.status NOT IN ('active', 'paused') THEN
    RAISE EXCEPTION 'Cannot record payment on % agreement', v_agreement.status;
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF v_method NOT IN ('cash', 'upi', 'bank', 'cheque', 'credit') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  IF _entry_date < v_agreement.interest_start_date THEN
    RAISE EXCEPTION 'Payment date cannot be before agreement start date';
  END IF;

  -- Idempotency
  IF _idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing_result
      FROM public.idempotency_log
      WHERE key = _idempotency_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    IF FOUND THEN
      RETURN (v_existing_result->>'payment_id')::uuid;
    END IF;
  END IF;

  -- Compute current accrued interest for auto-allocation.
  SELECT interest_outstanding, principal_outstanding
    INTO v_interest_outstanding, v_principal_outstanding
    FROM public.accrue_interest_to_date(_agreement_id, COALESCE(_entry_date, current_date));

  -- Determine allocation.
  IF _allocation IS NOT NULL THEN
    v_interest_portion := COALESCE(NULLIF(_allocation->>'interest_portion', '')::numeric, 0);
    v_principal_portion := COALESCE(NULLIF(_allocation->>'principal_portion', '')::numeric, 0);
    IF v_interest_portion < 0 OR v_principal_portion < 0 THEN
      RAISE EXCEPTION 'Allocation portions cannot be negative';
    END IF;
    IF v_interest_portion + v_principal_portion > _amount THEN
      RAISE EXCEPTION 'Allocation portions exceed total amount';
    END IF;
    v_adjustment_portion := _amount - v_interest_portion - v_principal_portion;
    -- For auto-validation, also confirm portions don't exceed the actual
    -- outstanding amounts (admin can't pay more interest than is owed).
    IF v_interest_portion > v_interest_outstanding THEN
      RAISE EXCEPTION 'Interest portion % exceeds outstanding interest %',
        v_interest_portion, v_interest_outstanding;
    END IF;
    IF v_principal_portion > v_principal_outstanding THEN
      RAISE EXCEPTION 'Principal portion % exceeds outstanding principal %',
        v_principal_portion, v_principal_outstanding;
    END IF;
  ELSE
    -- Auto-allocate: interest first, then principal.
    v_interest_portion := LEAST(_amount, v_interest_outstanding);
    v_principal_portion := LEAST(_amount - v_interest_portion, v_principal_outstanding);
    v_adjustment_portion := _amount - v_interest_portion - v_principal_portion;
  END IF;

  -- 1. Create the customer_transactions payment row.
  v_entry_type := CASE WHEN v_agreement.agreement_type = 'loan' THEN 'loan_repayment' ELSE 'payment' END;
  INSERT INTO public.customer_transactions (
    customer_id, entry_date, entry_type, product, quantity,
    amount, payment, method, remarks
  ) VALUES (
    v_agreement.customer_id, COALESCE(_entry_date, current_date),
    v_entry_type, 'Interest payment', 0,
    0, _amount, v_method,
    CONCAT_WS(' · ', _reference, _notes)
  )
  RETURNING id INTO v_ledger_tx_id;

  -- 2. Create the interest_payments row.
  INSERT INTO public.interest_payments (
    agreement_id, payment_date, amount,
    interest_portion, principal_portion, adjustment_portion,
    method, reference, notes,
    ledger_transaction_id, idempotency_key, created_by
  ) VALUES (
    _agreement_id, COALESCE(_entry_date, current_date), _amount,
    v_interest_portion, v_principal_portion, v_adjustment_portion,
    v_method, _reference, _notes,
    v_ledger_tx_id, _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_payment_id;

  -- 3. Update the agreement's outstanding_principal.
  UPDATE public.interest_agreements
     SET outstanding_principal = GREATEST(outstanding_principal - v_principal_portion, 0)
   WHERE id = _agreement_id;

  -- Idempotency: store result.
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_log (key, operation, result)
    VALUES (
      _idempotency_key,
      'record_interest_payment',
      jsonb_build_object(
        'payment_id', v_payment_id,
        'ledger_transaction_id', v_ledger_tx_id,
        'interest_portion', v_interest_portion,
        'principal_portion', v_principal_portion
      )
    )
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_interest_payment(uuid, numeric, text, date, jsonb, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_interest_payment(uuid, numeric, text, date, jsonb, text, text, text) TO authenticated;

-- =====================================================================
-- revise_interest_rate()
-- Adds a row to interest_agreement_rate_history and updates the
-- agreement's current interest_rate + rate_period. Prior periods are
-- unaffected: accrue_interest_to_date() walks segments using each
-- segment's own rate.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.revise_interest_rate(
  _agreement_id uuid,
  _new_rate numeric(8,4),
  _new_rate_period text,
  _effective_date date DEFAULT current_date,
  _reason text,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history_id uuid;
  v_existing_result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _new_rate IS NULL OR _new_rate < 0 THEN
    RAISE EXCEPTION 'Invalid rate';
  END IF;
  IF _new_rate_period NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid rate_period';
  END IF;
  IF _reason IS NULL OR BTRIM(_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for rate revisions';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.interest_agreements WHERE id = _agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing_result
      FROM public.idempotency_log
      WHERE key = _idempotency_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    IF FOUND THEN
      RETURN (v_existing_result->>'history_id')::uuid;
    END IF;
  END IF;

  INSERT INTO public.interest_agreement_rate_history (
    agreement_id, interest_rate, rate_period, effective_date,
    reason, created_by
  ) VALUES (
    _agreement_id, _new_rate, _new_rate_period,
    COALESCE(_effective_date, current_date),
    _reason, auth.uid()
  )
  RETURNING id INTO v_history_id;

  -- Update the agreement's current rate. The effective_date may be in
  -- the past (backdated revision); in that case the rate is "as of"
  -- the effective date and accrue_interest_to_date will pick it up.
  UPDATE public.interest_agreements
     SET interest_rate = _new_rate,
         rate_period = _new_rate_period
   WHERE id = _agreement_id;

  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_log (key, operation, result)
    VALUES (_idempotency_key, 'revise_interest_rate',
            jsonb_build_object('history_id', v_history_id))
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_history_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revise_interest_rate(uuid, numeric, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revise_interest_rate(uuid, numeric, text, date, text, text) TO authenticated;

-- =====================================================================
-- record_interest_adjustment()
-- Records a waiver / write_off / rate_change / other adjustment. For
-- waivers and write_offs, also updates the agreement's outstanding
-- principal (write_off only). Interest waiver reduces interest_outstanding
-- (handled at accrual time via the interest_waived_total calc).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_interest_adjustment(
  _agreement_id uuid,
  _adjustment_type text,
  _interest_delta numeric(14,2) DEFAULT 0,
  _principal_delta numeric(14,2) DEFAULT 0,
  _reason text,
  _adjustment_date date DEFAULT current_date,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id uuid;
  v_existing_result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _adjustment_type NOT IN ('waiver', 'write_off', 'rate_change', 'other') THEN
    RAISE EXCEPTION 'Invalid adjustment_type';
  END IF;
  IF _reason IS NULL OR BTRIM(_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for adjustments';
  END IF;
  IF _adjustment_type = 'waiver' AND _interest_delta > 0 THEN
    RAISE EXCEPTION 'Waiver interest_delta must be <= 0 (use a negative value to reduce interest)';
  END IF;
  IF _adjustment_type = 'write_off' AND _principal_delta > 0 THEN
    RAISE EXCEPTION 'Write_off principal_delta must be <= 0 (use a negative value to reduce principal)';
  END IF;
  IF _adjustment_type = 'rate_change' AND (_interest_delta <> 0 OR _principal_delta <> 0) THEN
    RAISE EXCEPTION 'rate_change adjustments must have zero deltas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.interest_agreements WHERE id = _agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing_result
      FROM public.idempotency_log
      WHERE key = _idempotency_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    IF FOUND THEN
      RETURN (v_existing_result->>'adjustment_id')::uuid;
    END IF;
  END IF;

  INSERT INTO public.interest_adjustments (
    agreement_id, adjustment_date, adjustment_type,
    interest_delta, principal_delta, reason,
    approved_by, idempotency_key, created_by
  ) VALUES (
    _agreement_id, COALESCE(_adjustment_date, current_date),
    _adjustment_type, _interest_delta, _principal_delta, _reason,
    auth.uid(), _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_adjustment_id;

  -- For write_off: reduce the agreement's outstanding_principal immediately.
  -- For waiver: interest_outstanding is computed at accrual time, so no
  -- agreement row update needed.
  IF _adjustment_type = 'write_off' AND _principal_delta <> 0 THEN
    UPDATE public.interest_agreements
       SET outstanding_principal = GREATEST(outstanding_principal + _principal_delta, 0)
     WHERE id = _agreement_id;
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_log (key, operation, result)
    VALUES (_idempotency_key, 'record_interest_adjustment',
            jsonb_build_object('adjustment_id', v_adjustment_id))
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_adjustment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_interest_adjustment(uuid, text, numeric, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_interest_adjustment(uuid, text, numeric, numeric, text, date, text) TO authenticated;

-- =====================================================================
-- settle_interest_agreement()
-- Closes the agreement. Only succeeds if total_settlement = 0 (i.e.
-- interest_outstanding = 0 AND principal_outstanding = 0). Sets status
-- to 'settled' and records the closed_at timestamp + reason.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.settle_interest_agreement(
  _agreement_id uuid,
  _settlement_date date DEFAULT current_date,
  _reason text DEFAULT 'Settled in full',
  _idempotency_key text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interest_outstanding numeric(14,2);
  v_principal_outstanding numeric(14,2);
  v_total_settlement numeric(14,2);
  v_existing_result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.interest_agreements
                  WHERE id = _agreement_id AND status IN ('active', 'paused')) THEN
    RAISE EXCEPTION 'Agreement not found or already closed';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing_result
      FROM public.idempotency_log
      WHERE key = _idempotency_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    IF FOUND THEN
      RETURN (v_existing_result->>'ok')::boolean;
    END IF;
  END IF;

  -- Check the current settlement amount.
  SELECT interest_outstanding, principal_outstanding, total_settlement
    INTO v_interest_outstanding, v_principal_outstanding, v_total_settlement
    FROM public.accrue_interest_to_date(_agreement_id, COALESCE(_settlement_date, current_date));

  IF v_total_settlement > 0 THEN
    RAISE EXCEPTION 'Cannot settle: outstanding balance is % (interest %, principal %)',
      v_total_settlement, v_interest_outstanding, v_principal_outstanding;
  END IF;

  UPDATE public.interest_agreements
     SET status = 'settled',
         closed_at = now(),
         closed_reason = _reason
   WHERE id = _agreement_id;

  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_log (key, operation, result)
    VALUES (_idempotency_key, 'settle_interest_agreement',
            jsonb_build_object('ok', true))
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_interest_agreement(uuid, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_interest_agreement(uuid, date, text, text) TO authenticated;
