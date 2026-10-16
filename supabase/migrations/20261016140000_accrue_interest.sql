-- Phase 5.5 — accrue_interest_to_date() pure function
--
-- Computes the interest accrued on an agreement up to a given date.
-- Does NOT modify any tables. Returns a row with:
--   accrued_interest_total  — all interest accrued from start through as_of
--   interest_paid_total     — sum of interest_portion from interest_payments
--   interest_waived_total   — sum of waiver interest_deltas (positive magnitude)
--   interest_outstanding     — accrued - paid - waived (>= 0)
--   principal_paid_total     — sum of principal_portion from interest_payments
--   principal_written_off_total — sum of write_off principal_deltas (positive magnitude)
--   principal_outstanding    — what's on the agreement row (kept current by triggers)
--   total_settlement         — interest_outstanding + principal_outstanding
--
-- Algorithm: walk the rate segments in interest_agreement_rate_history.
-- For each segment [effective_date, next_effective_date):
--   segment_days = (LEAST(as_of, next_effective_date) - effective_date)
--   segment_annual_rate = (monthly rate? rate * 12 : rate)
--   segment_interest = principal_at_segment_start * annual_rate/100 * segment_days/365
-- Where principal_at_segment_start = original_principal minus all principal
-- payments made BEFORE the segment start (or in prior segments). Payments
-- made WITHIN a segment reduce the base for LATER segments only.
--
-- This is the standard simple-interest amortization: interest does NOT
-- compound, and partial-period is handled as fractional days. The
-- approximation is that a mid-segment payment does not retroactively
-- reduce interest for that segment (only for future segments). This is
-- the "interest-first allocation" convention called out in the impact map.

CREATE OR REPLACE FUNCTION public.accrue_interest_to_date(
  _agreement_id uuid,
  _as_of date DEFAULT current_date
)
RETURNS TABLE(
  accrued_interest_total numeric(14,2),
  interest_paid_total numeric(14,2),
  interest_waived_total numeric(14,2),
  interest_outstanding numeric(14,2),
  principal_paid_total numeric(14,2),
  principal_written_off_total numeric(14,2),
  principal_outstanding numeric(14,2),
  total_settlement numeric(14,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement public.interest_agreements%ROWTYPE;
  v_rate record;
  v_next_effective date;
  v_segment_start date;
  v_segment_end date;
  v_segment_days numeric;
  v_annual_rate numeric;
  v_segment_interest numeric(14,2) := 0;
  v_accrued numeric(14,2) := 0;
  v_interest_paid numeric(14,2) := 0;
  v_interest_waived numeric(14,2) := 0;
  v_principal_paid_total numeric(14,2) := 0;
  v_principal_write_off numeric(14,2) := 0;
  v_principal_paid_in_segment numeric(14,2) := 0;
  v_principal_paid_before_segment numeric(14,2) := 0;
  v_principal_for_accrual numeric(14,2);
BEGIN
  SELECT * INTO v_agreement FROM public.interest_agreements WHERE id = _agreement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interest agreement % not found', _agreement_id;
  END IF;

  -- As-of date cannot be before the interest start date.
  IF _as_of < v_agreement.interest_start_date THEN
    RAISE EXCEPTION 'as_of date % is before agreement start date %',
      _as_of, v_agreement.interest_start_date;
  END IF;

  -- Compute total interest_paid and total principal_paid across ALL payments
  -- up to as_of. (These are returned as totals; we use the segment-level
  -- principal payment sums separately for the accrual walk.)
  SELECT
    COALESCE(SUM(interest_portion), 0),
    COALESCE(SUM(principal_portion), 0)
  INTO v_interest_paid, v_principal_paid_total
  FROM public.interest_payments
  WHERE agreement_id = _agreement_id
    AND payment_date <= _as_of;

  -- Compute total waiver and write_off from adjustments.
  SELECT
    COALESCE(SUM(interest_delta) FILTER (WHERE adjustment_type = 'waiver'), 0),
    COALESCE(SUM(principal_delta) FILTER (WHERE adjustment_type = 'write_off'), 0)
  INTO v_interest_waived, v_principal_write_off
  FROM public.interest_adjustments
  WHERE agreement_id = _agreement_id
    AND adjustment_date <= _as_of;

  -- Waivers reduce interest, so v_interest_waived is the (negative) sum of
  -- interest_deltas. Convert to positive magnitude for the "waived total".
  v_interest_waived := -v_interest_waived;
  v_principal_write_off := -v_principal_write_off;

  -- Walk the rate segments. Build an ordered list of (effective_date,
  -- interest_rate, rate_period). Seed with an implicit segment at
  -- interest_start_date using the EARLIEST rate_history row (or the
  -- agreement's current rate as fallback).
  v_principal_for_accrual := v_agreement.original_principal;
  v_principal_paid_before_segment := 0;

  FOR v_rate IN
    WITH rate_segments AS (
      SELECT
        v_agreement.interest_start_date AS effective_date,
        COALESCE(
          (SELECT rh.interest_rate
             FROM public.interest_agreement_rate_history rh
            WHERE rh.agreement_id = v_agreement.id
            ORDER BY rh.effective_date ASC
            LIMIT 1),
          v_agreement.interest_rate
        ) AS interest_rate,
        COALESCE(
          (SELECT rh.rate_period
             FROM public.interest_agreement_rate_history rh
            WHERE rh.agreement_id = v_agreement.id
            ORDER BY rh.effective_date ASC
            LIMIT 1),
          v_agreement.rate_period
        ) AS rate_period
      UNION ALL
      SELECT effective_date, interest_rate, rate_period
        FROM public.interest_agreement_rate_history rh
       WHERE rh.agreement_id = v_agreement.id
         AND rh.effective_date > v_agreement.interest_start_date
    )
    SELECT * FROM rate_segments ORDER BY effective_date ASC
  LOOP
    -- Determine the upper bound of this segment (next rate change, or as_of).
    SELECT MIN(effective_date) INTO v_next_effective
      FROM public.interest_agreement_rate_history
      WHERE agreement_id = v_agreement.id
        AND effective_date > v_rate.effective_date;

    v_segment_start := GREATEST(v_rate.effective_date, v_agreement.interest_start_date);
    v_segment_end := LEAST(_as_of, COALESCE(v_next_effective, _as_of));

    IF v_segment_end > v_segment_start THEN
      v_segment_days := v_segment_end - v_segment_start;

      -- Normalize the segment rate to annual (monthly rate × 12).
      IF v_rate.rate_period = 'monthly' THEN
        v_annual_rate := v_rate.interest_rate * 12;
      ELSE
        v_annual_rate := v_rate.interest_rate;
      END IF;

      -- Simple interest for this segment.
      v_segment_interest := v_principal_for_accrual * (v_annual_rate / 100.0) * (v_segment_days / 365.0);
      v_accrued := v_accrued + v_segment_interest;

      -- Sum principal payments made in THIS segment (so they reduce the
      -- base for subsequent segments).
      SELECT COALESCE(SUM(principal_portion), 0) INTO v_principal_paid_in_segment
        FROM public.interest_payments
       WHERE agreement_id = _agreement_id
         AND payment_date >= v_segment_start
         AND payment_date < v_segment_end;

      v_principal_for_accrual := GREATEST(v_principal_for_accrual - v_principal_paid_in_segment, 0);
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT
    ROUND(v_accrued, 2)::numeric(14,2),
    ROUND(v_interest_paid, 2)::numeric(14,2),
    ROUND(v_interest_waived, 2)::numeric(14,2),
    GREATEST(ROUND(v_accrued - v_interest_paid - v_interest_waived, 2), 0)::numeric(14,2),
    ROUND(v_principal_paid_total, 2)::numeric(14,2),
    ROUND(v_principal_write_off, 2)::numeric(14,2),
    GREATEST(ROUND(v_agreement.outstanding_principal - v_principal_write_off, 2), 0)::numeric(14,2),
    (GREATEST(ROUND(v_accrued - v_interest_paid - v_interest_waived, 2), 0)
       + GREATEST(ROUND(v_agreement.outstanding_principal - v_principal_write_off, 2), 0))::numeric(14,2);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accrue_interest_to_date(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accrue_interest_to_date(uuid, date) TO authenticated;
