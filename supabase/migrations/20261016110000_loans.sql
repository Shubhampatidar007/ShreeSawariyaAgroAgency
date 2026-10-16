-- Phase 5.2 — Direct loans table
--
-- A direct loan is a separate financial event from a sale. It records
-- money the shop handed to the customer (cash in hand to a farmer, e.g.),
-- with a separate interest agreement (agreement_type='loan').
--
-- Direct loans NEVER touch inventory, products, or sales revenue totals.
-- They appear in the customer ledger via a customer_transactions row of
-- entry_type='loan_disbursement' (created by create_direct_loan() in
-- Phase 5.7), so the customer's current_due correctly reflects the loan
-- principal owed.

CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  principal_disbursed numeric(14,2) NOT NULL CHECK (principal_disbursed > 0),

  -- When the money changed hands.
  disbursement_date date NOT NULL DEFAULT current_date,

  -- How the money was handed over (cash/upi/bank/cheque).
  payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'upi', 'bank', 'cheque')),

  -- Optional reference (UTR, cheque no., etc.)
  payment_reference text,

  notes text,

  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX loans_customer_idx ON public.loans (customer_id);
CREATE INDEX loans_disbursement_date_idx ON public.loans (disbursement_date);
CREATE INDEX loans_idem_idx ON public.loans (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_staff" ON public.loans FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "loans_own_read" ON public.loans FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;

-- Now that the loans table exists, add the loan_id FK column to
-- interest_agreements (was deferred from Phase 5.1 due to FK forward-ref).
ALTER TABLE public.interest_agreements
  ADD COLUMN loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL;

CREATE INDEX interest_agreements_loan_idx
  ON public.interest_agreements (loan_id)
  WHERE loan_id IS NOT NULL;

-- Extend the existing customer_transactions entry_type CHECK to include
-- the new loan-related entry types. The original schema had no explicit
-- CHECK on entry_type (just a comment listing purchase | payment | credit
-- | adjustment). Subsequent migrations added 'sale' and 'return' in
-- practice. We use a DO block to be idempotent: if a constraint with this
-- name already exists, drop it first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_transactions_entry_type_chk'
      AND conrelid = 'public.customer_transactions'::regclass
  ) THEN
    ALTER TABLE public.customer_transactions
      DROP CONSTRAINT customer_transactions_entry_type_chk;
  END IF;
END $$;

ALTER TABLE public.customer_transactions
  ADD CONSTRAINT customer_transactions_entry_type_chk
  CHECK (entry_type IN ('purchase', 'sale', 'payment', 'credit', 'adjustment', 'return',
                        'loan_disbursement', 'loan_repayment'));
