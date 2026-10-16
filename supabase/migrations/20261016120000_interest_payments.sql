-- Phase 5.3 — Interest payments (allocations across interest / principal / adjustment)
--
-- One row per payment against an interest agreement. A single customer
-- payment may map to one or more interest_payments rows (one per agreement
-- being paid). The customer_transactions row of entry_type='payment' (or
-- 'loan_repayment') is the customer-facing ledger entry; this table is the
-- agreement-internal detail of how that payment was allocated.
--
-- Convention: allocate interest-first, then principal. The admin can
-- override via _allocation jsonb in record_interest_payment() (Phase 5.7).

CREATE TABLE public.interest_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.interest_agreements(id) ON DELETE CASCADE,

  payment_date date NOT NULL DEFAULT current_date,

  -- Total amount of this payment (interest_portion + principal_portion +
  -- adjustment_portion must equal amount).
  amount numeric(14,2) NOT NULL CHECK (amount > 0),

  -- How the amount was split. All three are >= 0 except adjustment_portion
  -- which can be negative (e.g. a waiver applied alongside a payment).
  interest_portion numeric(14,2) NOT NULL DEFAULT 0 CHECK (interest_portion >= 0),
  principal_portion numeric(14,2) NOT NULL DEFAULT 0 CHECK (principal_portion >= 0),
  adjustment_portion numeric(14,2) NOT NULL DEFAULT 0,

  method text NOT NULL DEFAULT 'cash'
    CHECK (method IN ('cash', 'upi', 'bank', 'cheque', 'credit')),

  reference text,
  notes text,

  -- Links back to the customer_transactions payment row that was created
  -- for this payment (if any). On-delete SET NULL so we don't lose the
  -- interest payment record if the ledger row is deleted.
  ledger_transaction_id uuid REFERENCES public.customer_transactions(id) ON DELETE SET NULL,

  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Always enforce the split math.
  CONSTRAINT interest_payments_split_chk
    CHECK (round((interest_portion + principal_portion + adjustment_portion)::numeric, 2)
           = round(amount::numeric, 2))
);

CREATE INDEX interest_payments_agreement_idx ON public.interest_payments (agreement_id, payment_date);
CREATE INDEX interest_payments_date_idx ON public.interest_payments (payment_date);
CREATE INDEX interest_payments_idem_idx ON public.interest_payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.interest_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ip_staff" ON public.interest_payments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "ip_own_read" ON public.interest_payments FOR SELECT TO authenticated
  USING (agreement_id IN (
    SELECT id FROM public.interest_agreements ia
    JOIN public.customers c ON c.id = ia.customer_id
    WHERE c.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interest_payments TO authenticated;
GRANT ALL ON public.interest_payments TO service_role;
