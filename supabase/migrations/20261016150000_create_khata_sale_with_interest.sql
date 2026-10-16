-- Phase 5.6 — create_khata_sale_with_interest() wrapper RPC
--
-- Atomic: sale + interest agreement. When _interest_settings is NULL,
-- behaves identically to create_khata_sale_with_bargaining (the existing
-- sale RPC). When _interest_settings is provided, creates the sale
-- first (calling the existing RPC), then creates an interest_agreements
-- row attached to the sale's transaction_id, plus an initial row in
-- interest_agreement_rate_history.
--
-- Both steps run inside a single transaction. If step 2 fails, the
-- entire sale is rolled back. This guarantees atomicity for the UI's
-- "Save sale with interest" action.
--
-- _interest_settings jsonb shape:
--   {
--     "interest_rate": 12.0,          -- required, percentage
--     "rate_period": "annual",         -- required, 'monthly' or 'annual'
--     "interest_start_date": "2026-10-16", -- required, defaults to sale date
--     "eligible_principal": 5000.0,    -- optional, defaults to (sale.total - sale.payment)
--     "notes": "Customer agreed verbally", -- optional
--     "terms_confirmed": true          -- required, must be true
--   }
--
-- Idempotency: if _idempotency_key matches an existing successful
-- operation in idempotency_log within 24h, return the stored result
-- instead of re-executing.

CREATE OR REPLACE FUNCTION public.create_khata_sale_with_interest(
  _customer_id uuid,
  _items jsonb,
  _paid numeric DEFAULT 0,
  _bargaining_amount numeric DEFAULT 0,
  _method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,
  _remarks text DEFAULT NULL,
  _interest_settings jsonb DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_settings jsonb := _interest_settings;
  v_rate numeric(8,4);
  v_rate_period text;
  v_start_date date;
  v_eligible_principal numeric(14,2);
  v_notes text;
  v_terms_confirmed boolean;
  v_sale_total numeric;
  v_sale_paid numeric;
  v_agreement_id uuid;
  v_existing_result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Idempotency check: if a previous successful call used the same key
  -- within 24h, return its stored result.
  IF _idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing_result
      FROM public.idempotency_log
      WHERE key = _idempotency_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    IF FOUND THEN
      -- Return the stored tx_id (the result jsonb has {tx_id: "..."}).
      RETURN (v_existing_result->>'tx_id')::uuid;
    END IF;
  END IF;

  -- STEP 1: create the sale via the existing RPC. This preserves all
  -- existing behavior (inventory deduction, custom-item creation,
  -- loose-sale COGS normalization, customer_transactions row, trigger
  -- fires recalc_customer_balance + payments row, etc.).
  v_tx_id := public.create_khata_sale_with_bargaining(
    _customer_id, _items, _paid, _bargaining_amount,
    _method, _entry_date, _remarks
  );

  -- STEP 2 (only if interest settings provided): create the agreement.
  IF v_settings IS NOT NULL THEN
    -- Validate the interest settings.
    v_rate := COALESCE(NULLIF(v_settings->>'interest_rate', '')::numeric, NULL);
    IF v_rate IS NULL OR v_rate < 0 THEN
      RAISE EXCEPTION 'Invalid interest_rate in _interest_settings';
    END IF;

    v_rate_period := COALESCE(v_settings->>'rate_period', 'annual');
    IF v_rate_period NOT IN ('monthly', 'annual') THEN
      RAISE EXCEPTION 'Invalid rate_period: %', v_rate_period;
    END IF;

    v_start_date := COALESCE(
      NULLIF(v_settings->>'interest_start_date', '')::date,
      COALESCE(_entry_date, current_date)
    );

    v_terms_confirmed := COALESCE((v_settings->>'terms_confirmed')::boolean, false);
    IF NOT v_terms_confirmed THEN
      RAISE EXCEPTION 'Terms must be confirmed to create an interest agreement';
    END IF;

    v_notes := v_settings->>'notes';

    -- Eligible principal: defaults to (sale total - sale payment).
    SELECT amount, payment INTO v_sale_total, v_sale_paid
      FROM public.customer_transactions WHERE id = v_tx_id;

    v_eligible_principal := COALESCE(
      NULLIF(v_settings->>'eligible_principal', '')::numeric,
      GREATEST(v_sale_total - v_sale_paid, 0)
    );

    IF v_eligible_principal < 0 THEN
      RAISE EXCEPTION 'Eligible principal cannot be negative';
    END IF;

    IF v_eligible_principal = 0 THEN
      -- Sale was fully paid; no principal to charge interest on.
      -- Skip agreement creation, but still return the tx_id.
    ELSE
      INSERT INTO public.interest_agreements (
        customer_id, agreement_type, source_transaction_id, loan_id,
        original_principal, outstanding_principal,
        interest_rate, rate_period, interest_start_date,
        method, status, notes, terms_confirmed,
        idempotency_key, created_by
      ) VALUES (
        _customer_id, 'sale', v_tx_id, NULL,
        v_eligible_principal, v_eligible_principal,
        v_rate, v_rate_period, v_start_date,
        'simple', 'active', v_notes, true,
        _idempotency_key, auth.uid()
      )
      RETURNING id INTO v_agreement_id;

      -- Seed the rate history with the initial rate.
      INSERT INTO public.interest_agreement_rate_history (
        agreement_id, interest_rate, rate_period, effective_date,
        reason, created_by
      ) VALUES (
        v_agreement_id, v_rate, v_rate_period, v_start_date,
        'Initial rate at agreement creation', auth.uid()
      );
    END IF;
  END IF;

  -- Idempotency: store the result for 24h.
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_log (key, operation, result)
    VALUES (
      _idempotency_key,
      'create_khata_sale_with_interest',
      jsonb_build_object('tx_id', v_tx_id, 'agreement_id', v_agreement_id)
    )
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_khata_sale_with_interest(uuid, jsonb, numeric, numeric, text, date, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_interest(uuid, jsonb, numeric, numeric, text, date, text, jsonb, text) TO authenticated;
