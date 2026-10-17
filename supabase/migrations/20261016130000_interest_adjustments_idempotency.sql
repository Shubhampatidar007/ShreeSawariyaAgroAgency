-- Phase 5.4 — Interest adjustments + idempotency log
--
-- Adjustments capture waivers, write-offs, and metadata-only rate changes
-- (the rate itself is in interest_agreement_rate_history; this row records
-- the financial impact, if any, of the change event).
--
-- interest_delta and principal_delta can be negative (reducing the owed
-- amount) or positive (rare, e.g. a reclassification that increases owed
-- interest). The convention is: positive delta = customer owes more,
-- negative delta = customer owes less.

CREATE TABLE public.interest_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.interest_agreements(id) ON DELETE CASCADE,

  adjustment_date date NOT NULL DEFAULT current_date,

  -- 'waiver' = reduce interest owed (interest_delta < 0)
  -- 'write_off' = reduce principal owed (principal_delta < 0)
  -- 'rate_change' = metadata only (deltas = 0); the rate itself is in rate_history
  -- 'other' = anything else (e.g. a negotiated settlement tweak)
  adjustment_type text NOT NULL
    CHECK (adjustment_type IN ('waiver', 'write_off', 'rate_change', 'other')),

  interest_delta numeric(14,2) NOT NULL DEFAULT 0,
  principal_delta numeric(14,2) NOT NULL DEFAULT 0,

  -- Required human-readable reason. Audit trail depends on this never being empty.
  reason text NOT NULL,

  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- A waiver must reduce interest (or be zero); a write_off must reduce
  -- principal (or be zero); a rate_change must have zero deltas.
  CONSTRAINT interest_adjustments_waiver_chk
    CHECK (adjustment_type <> 'waiver' OR interest_delta <= 0),
  CONSTRAINT interest_adjustments_writeoff_chk
    CHECK (adjustment_type <> 'write_off' OR principal_delta <= 0),
  CONSTRAINT interest_adjustments_ratechange_chk
    CHECK (adjustment_type <> 'rate_change' OR (interest_delta = 0 AND principal_delta = 0))
);

CREATE INDEX interest_adjustments_agreement_idx ON public.interest_adjustments (agreement_id, adjustment_date);
CREATE INDEX interest_adjustments_idem_idx ON public.interest_adjustments (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.interest_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_adj_staff" ON public.interest_adjustments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "ia_adj_own_read" ON public.interest_adjustments FOR SELECT TO authenticated
  USING (agreement_id IN (
    SELECT ia.id FROM public.interest_agreements ia
    JOIN public.customers c ON c.id = ia.customer_id
    WHERE c.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interest_adjustments TO authenticated;
GRANT ALL ON public.interest_adjustments TO service_role;

-- ============ Idempotency log ============
--
-- Stores the result of an idempotent operation keyed by client-provided
-- idempotency_key. RPC functions check this table before executing; if a
-- matching key exists within the last 24 hours, the stored result is
-- returned instead of executing the operation again.
--
-- Only service_role can read/write this directly (the RPCs that use it
-- are SECURITY DEFINER so they have access via the function's role).

CREATE TABLE public.idempotency_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  operation text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idempotency_log_created_idx ON public.idempotency_log (created_at);

ALTER TABLE public.idempotency_log ENABLE ROW LEVEL SECURITY;
-- No authenticated policy: only service_role (SECURITY DEFINER RPCs) accesses it.
REVOKE ALL ON public.idempotency_log FROM authenticated, anon;
GRANT ALL ON public.idempotency_log TO service_role;

-- Helper to purge stale idempotency rows (call from a scheduled job or
-- manually). 24h retention.
CREATE OR REPLACE FUNCTION public.purge_idempotency_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.idempotency_log
   WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.purge_idempotency_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_idempotency_log() TO authenticated;
