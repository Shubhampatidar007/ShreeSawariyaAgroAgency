-- Phase 5.1 — Interest agreements + rate history
--
-- An interest agreement captures a binding decision to charge simple interest
-- on an outstanding balance. Two kinds:
--   * agreement_type='sale'  → attached to an existing customer_transactions row
--                              (source_transaction_id is set, loan_id is NULL)
--   * agreement_type='loan'  → a direct loan with no underlying sale
--                              (loan_id is set, source_transaction_id is NULL)
--
-- The current rate lives on interest_agreements.interest_rate. Every rate
-- change (including the initial rate at agreement creation) is also written
-- to interest_agreement_rate_history so we can walk segments when computing
-- accrued interest across rate changes (see Phase 5.5).

CREATE TABLE public.interest_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  agreement_type text NOT NULL CHECK (agreement_type IN ('sale', 'loan')),

  -- For sale-backed: the underlying sale row. For loan: NULL.
  -- (loan_id is added in migration 20261016110000_loans.sql after the
  --  loans table exists, because Postgres forbids forward references
  --  in FK constraints.)
  source_transaction_id uuid REFERENCES public.customer_transactions(id) ON DELETE SET NULL,

  -- Original principal at agreement start. For a sale: amount - payment.
  -- For a loan: principal_disbursed. Stored separately so we can show
  -- "original" even after principal repayments reduce outstanding_principal.
  original_principal numeric(14,2) NOT NULL CHECK (original_principal >= 0),

  -- Current outstanding principal. Decreases as principal payments land.
  outstanding_principal numeric(14,2) NOT NULL CHECK (outstanding_principal >= 0),

  -- Interest rate as a percentage (e.g. 12 = 12%). rate_period tells us
  -- whether the rate is per month or per annum.
  interest_rate numeric(8,4) NOT NULL CHECK (interest_rate >= 0),
  rate_period text NOT NULL DEFAULT 'annual' CHECK (rate_period IN ('monthly', 'annual')),

  -- When interest starts accruing. Defaults to current_date at insert time.
  interest_start_date date NOT NULL DEFAULT current_date,

  -- Only 'simple' is supported initially. Column exists so we can add
  -- 'compound' later without a schema change.
  method text NOT NULL DEFAULT 'simple' CHECK (method IN ('simple')),

  -- 'active' | 'paused' (interest accrual frozen) | 'settled' | 'closed'
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'settled', 'closed')),

  notes text,
  terms_confirmed boolean NOT NULL DEFAULT false,

  -- Idempotency: if the client passes the same key within 24h, return the
  -- original result instead of creating duplicates.
  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_reason text
);

CREATE INDEX interest_agreements_customer_idx ON public.interest_agreements (customer_id);
CREATE INDEX interest_agreements_status_idx ON public.interest_agreements (status);
CREATE INDEX interest_agreements_source_tx_idx ON public.interest_agreements (source_transaction_id) WHERE source_transaction_id IS NOT NULL;
CREATE INDEX interest_agreements_idem_idx ON public.interest_agreements (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.interest_agreements ENABLE ROW LEVEL SECURITY;

-- Staff can do everything. Customers can read their own agreements.
CREATE POLICY "ia_staff" ON public.interest_agreements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "ia_own_read" ON public.interest_agreements FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interest_agreements TO authenticated;
GRANT ALL ON public.interest_agreements TO service_role;

-- Rate history. One row per rate change. The interest_agreements.interest_rate
-- column always reflects the LATEST rate; this table holds the historical
-- record so we can walk segments when computing accrued interest across
-- rate changes (see Phase 5.5).
CREATE TABLE public.interest_agreement_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.interest_agreements(id) ON DELETE CASCADE,
  interest_rate numeric(8,4) NOT NULL CHECK (interest_rate >= 0),
  rate_period text NOT NULL CHECK (rate_period IN ('monthly', 'annual')),
  effective_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX interest_rate_history_agreement_idx ON public.interest_agreement_rate_history (agreement_id, effective_date);

ALTER TABLE public.interest_agreement_rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iarh_staff" ON public.interest_agreement_rate_history FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "iarh_own_read" ON public.interest_agreement_rate_history FOR SELECT TO authenticated
  USING (agreement_id IN (
    SELECT id FROM public.interest_agreements ia
    JOIN public.customers c ON c.id = ia.customer_id
    WHERE c.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interest_agreement_rate_history TO authenticated;
GRANT ALL ON public.interest_agreement_rate_history TO service_role;

-- updated_at trigger for interest_agreements (matches existing pattern)
CREATE TRIGGER t_interest_agreements_upd BEFORE UPDATE ON public.interest_agreements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
