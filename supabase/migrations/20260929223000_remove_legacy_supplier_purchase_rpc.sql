-- Remove the legacy supplier-purchase RPC that merged same-priced inventory rows.
-- Purchases must now always create independent normalized inventory lots.
BEGIN;
DROP FUNCTION IF EXISTS public.record_supplier_purchase(
  uuid,text,numeric,text,numeric,numeric,date,numeric,text
);
COMMIT;