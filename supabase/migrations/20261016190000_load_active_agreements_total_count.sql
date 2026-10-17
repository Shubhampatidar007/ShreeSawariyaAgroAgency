-- Phase 5.10 — Add total_count to load_active_interest_agreements
--
-- The original implementation returned only the page rows without a total
-- count, forcing the UI to use `activeAgreements.length` as a hack for
-- pagination (it couldn't tell whether more pages existed). This adds a
-- proper total_count output column.
--
-- Re-running this migration is safe: CREATE OR REPLACE updates the
-- existing function. The signature changes from 14 output columns to 15,
-- which is a breaking change for any existing caller — but the only
-- caller is shopStore.loadActiveInterestAgreements, which we're updating
-- in lockstep to read the new column.

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
  total_settlement numeric,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_search_pattern text;
  v_total bigint;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_offset := (GREATEST(_page, 1) - 1) * LEAST(GREATEST(_page_size, 1), 100);
  v_search_pattern := CASE
    WHEN _search IS NULL OR BTRIM(_search) = '' THEN NULL
    ELSE '%' || LOWER(BTRIM(_search)) || '%'
  END;

  -- Compute the total count of matching agreements (independent of pagination).
  SELECT count(*) INTO v_total
    FROM public.interest_agreements ia
    JOIN public.customers c ON c.id = ia.customer_id
   WHERE ia.status IN ('active', 'paused')
     AND (v_search_pattern IS NULL
          OR LOWER(c.name) LIKE v_search_pattern
          OR c.mobile LIKE v_search_pattern)
     AND (_village IS NULL OR _village = '' OR c.village = _village)
     AND (_date_from IS NULL OR ia.interest_start_date >= _date_from)
     AND (_date_to IS NULL OR ia.interest_start_date <= _date_to);

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
    acc.total_settlement,
    v_total AS total_count
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
