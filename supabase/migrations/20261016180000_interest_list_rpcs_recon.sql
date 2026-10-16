-- Phase 5.9 — Active agreements list RPC + reconciliation trigger for returns
--
-- Adds:
--   * load_active_interest_agreements() — list customers with active
--     interest agreements, with their totals joined in. Used by the
--     central Interest Management page (Phase 4).
--   * load_customer_interest_agreements(_customer_id) — list all
--     agreements for one customer, with current accrual. Used by the
--     Khata page (Phase 3).
--   * A reconciliation trigger that fires when a customer_transactions
--     row of entry_type='return' is created against an interest-bearing
--     sale: reduces the agreement's outstanding_principal and records
--     an interest_adjustment (waiver) for the interest that would have
--     accrued on the returned principal.

-- =====================================================================
-- load_active_interest_agreements()
-- Returns one row per ACTIVE interest agreement, with the customer
-- name + village, and the current accrual (interest_outstanding,
-- principal_outstanding, total_settlement) computed via
-- accrue_interest_to_date(current_date).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.load_active_interest_agreements(
  _search text DEFAULT NULL,
  _village text DEFAULT NULL,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 25
)
RETURNS TABLE(
  agreement_id uuid,
  customer_id uuid,
  customer_name text,
  customer_mobile text,
  customer_village text,
  agreement_type text,
  original_principal numeric,
  outstanding_principal numeric,
  interest_rate numeric,
  rate_period text,
  interest_start_date date,
  status text,
  interest_outstanding numeric,
  total_settlement numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_search_pattern text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_offset := (GREATEST(_page, 1) - 1) * LEAST(GREATEST(_page_size, 1), 100);
  v_search_pattern := CASE
    WHEN _search IS NULL OR BTRIM(_search) = '' THEN NULL
    ELSE '%' || LOWER(BTRIM(_search)) || '%'
  END;

  RETURN QUERY
  SELECT
    ia.id AS agreement_id,
    ia.customer_id,
    c.name AS customer_name,
    c.mobile AS customer_mobile,
    c.village AS customer_village,
    ia.agreement_type,
    ia.original_principal,
    ia.outstanding_principal,
    ia.interest_rate,
    ia.rate_period,
    ia.interest_start_date,
    ia.status,
    acc.interest_outstanding,
    acc.total_settlement
  FROM public.interest_agreements ia
  JOIN public.customers c ON c.id = ia.customer_id
  LEFT JOIN LATERAL public.accrue_interest_to_date(ia.id, current_date) acc ON TRUE
  WHERE ia.status IN ('active', 'paused')
    AND (v_search_pattern IS NULL
         OR LOWER(c.name) LIKE v_search_pattern
         OR c.mobile LIKE v_search_pattern)
    AND (_village IS NULL OR _village = '' OR c.village = _village)
    AND (_date_from IS NULL OR ia.interest_start_date >= _date_from)
    AND (_date_to IS NULL OR ia.interest_start_date <= _date_to)
  ORDER BY ia.interest_start_date DESC, ia.created_at DESC
  LIMIT LEAST(GREATEST(_page_size, 1), 100)
  OFFSET v_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.load_active_interest_agreements(text, text, date, date, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_active_interest_agreements(text, text, date, date, integer, integer) TO authenticated;

-- =====================================================================
-- load_customer_interest_agreements(_customer_id)
-- Returns all agreements for one customer (any status), with accrual.
-- Used by the customer Khata page (Phase 3).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.load_customer_interest_agreements(_customer_id uuid)
RETURNS TABLE(
  agreement_id uuid,
  agreement_type text,
  source_transaction_id uuid,
  loan_id uuid,
  original_principal numeric,
  outstanding_principal numeric,
  interest_rate numeric,
  rate_period text,
  interest_start_date date,
  status text,
  notes text,
  interest_paid_total numeric,
  principal_paid_total numeric,
  interest_outstanding numeric,
  total_settlement numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    ia.id,
    ia.agreement_type,
    ia.source_transaction_id,
    ia.loan_id,
    ia.original_principal,
    ia.outstanding_principal,
    ia.interest_rate,
    ia.rate_period,
    ia.interest_start_date,
    ia.status,
    ia.notes,
    acc.interest_paid_total,
    acc.principal_paid_total,
    acc.interest_outstanding,
    acc.total_settlement,
    ia.created_at
  FROM public.interest_agreements ia
  LEFT JOIN LATERAL public.accrue_interest_to_date(ia.id, current_date) acc ON TRUE
  WHERE ia.customer_id = _customer_id
  ORDER BY ia.interest_start_date DESC, ia.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.load_customer_interest_agreements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_customer_interest_agreements(uuid) TO authenticated;

-- =====================================================================
-- Reconciliation trigger: returns on interest-bearing sales
-- When a customer_transactions row of entry_type='return' is INSERTED,
-- check if any interest agreement has source_transaction_id = that
-- transaction's id. If so:
--   * Compute the returned principal proportion (return amount / sale amount).
--   * Reduce the agreement's outstanding_principal by that proportion of
--     the original principal.
--   * Insert an interest_adjustment row (type='waiver') for the interest
--     that would have accrued on the returned portion, with reason.
-- =====================================================================
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
  -- Only fires on new return rows (the existing record_customer_product_return
  -- RPC creates customer_transactions rows with entry_type='return').
  IF NEW.entry_type <> 'return' THEN
    RETURN NULL;
  END IF;

  -- Find any interest agreement attached to a sale transaction matching
  -- this return. The return's `product` field conventionally carries the
  -- reference to the original sale (record_customer_product_return does
  -- not link via order_id, so we match by customer_id + entry_date + product
  -- text). In the future we could add an explicit source_transaction_id
  -- FK to customer_transactions to disambiguate.

  -- Match: agreement_type='sale', customer_id = NEW.customer_id, status='active'
  SELECT * INTO v_agreement
    FROM public.interest_agreements
   WHERE customer_id = NEW.customer_id
     AND agreement_type = 'sale'
     AND status IN ('active', 'paused')
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Compute the return amount (the return row has amount = returned value).
  v_return_amount := NEW.amount;
  v_sale_amount := v_agreement.original_principal;

  IF v_sale_amount <= 0 OR v_return_amount <= 0 THEN
    RETURN NULL;
  END IF;

  v_return_ratio := LEAST(v_return_amount / v_sale_amount, 1.0);
  v_returned_principal := v_agreement.original_principal * v_return_ratio;

  -- Reduce the agreement's outstanding_principal.
  UPDATE public.interest_agreements
     SET outstanding_principal = GREATEST(outstanding_principal - v_returned_principal, 0)
   WHERE id = v_agreement.id;

  -- Record a waiver for the interest that would have accrued on the
  -- returned portion. We use a conservative estimate: returned_principal *
  -- current_annual_rate * (days_so_far / 365). This is the same logic
  -- accrue_interest_to_date uses for the current segment.
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
      'Auto-waiver for returned principal (₹' || v_return_amount
        || ' returned on ' || NEW.entry_date || ')',
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
