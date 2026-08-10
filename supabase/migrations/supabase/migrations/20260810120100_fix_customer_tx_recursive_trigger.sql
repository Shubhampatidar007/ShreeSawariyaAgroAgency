-- Root cause: the original trigger's own internal UPDATE of remaining_due
-- re-fired itself (AFTER INSERT OR UPDATE ... FOR EACH ROW with no column
-- filter), causing a second pass through the "insert into payments" branch
-- whenever the running balance actually changed -> duplicate rows in
-- public.payments. Found and reproduced while testing the khata payment flow.
--
-- Fix: (1) only create a payments record on the true INSERT event, never on
-- the trigger's own follow-up UPDATE, and (2) scope the UPDATE trigger to the
-- meaningful columns only, so writing remaining_due can never re-trigger it.

DROP TRIGGER IF EXISTS t_customer_tx ON public.customer_transactions;

CREATE OR REPLACE FUNCTION public.customer_tx_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; running numeric;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  PERFORM public.recalc_customer_balance(cid);
  SELECT credit_balance INTO running FROM public.customers WHERE id = cid;
  IF TG_OP <> 'DELETE' THEN
    UPDATE public.customer_transactions SET remaining_due = running WHERE id = NEW.id AND remaining_due IS DISTINCT FROM running;
    IF TG_OP = 'INSERT' AND NEW.payment > 0 THEN
      INSERT INTO public.payments (reference, direction, party_id, party_name, entry_date, amount, method, status, remarks)
      SELECT 'KH-' || substr(NEW.id::text,1,8), 'incoming', c.id, c.name, NEW.entry_date, NEW.payment, NEW.method, 'success',
             COALESCE(NEW.remarks, CASE WHEN NEW.entry_type = 'payment' THEN 'Khata repayment' ELSE 'Advance received with credit sale' END)
      FROM public.customers c WHERE c.id = cid;
    END IF;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.customer_tx_after() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER t_customer_tx_ins_del
  AFTER INSERT OR DELETE ON public.customer_transactions
  FOR EACH ROW EXECUTE FUNCTION public.customer_tx_after();

CREATE TRIGGER t_customer_tx_upd
  AFTER UPDATE OF customer_id, entry_type, product, quantity, amount, payment, method, entry_date, remarks
  ON public.customer_transactions
  FOR EACH ROW EXECUTE FUNCTION public.customer_tx_after();
