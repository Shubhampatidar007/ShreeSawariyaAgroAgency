-- Phase 5.8 — Product sales search + Most Sold aggregation RPCs
--
-- Used by Phase 1 (admin/product-sales page). Searches customer_transaction_items
-- joined to customer_transactions + customers. Returns paginated rows
-- with customer info, transaction info, and item-level details.
--
-- Filter parameters:
--   _product:  case-insensitive LIKE match on customer_transaction_items.product
--   _date_from / _date_to: inclusive date range on customer_transactions.entry_date
--   _rate:    exact match on customer_transaction_items.rate (NULL = ignore)
--   _quantity: exact match on customer_transaction_items.quantity (NULL = ignore)
--
-- Sorting: by date asc/desc, amount asc/desc, customer_name asc/desc
--
-- Returns the matched items PLUS the parent transaction's total amount,
-- total payment, and outstanding due (so the UI can show "this item was
-- part of a ₹5000 sale, ₹3000 paid, ₹2000 due").

CREATE OR REPLACE FUNCTION public.search_product_sales(
  _product text DEFAULT NULL,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _rate numeric DEFAULT NULL,
  _quantity numeric DEFAULT NULL,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 25,
  _sort_by text DEFAULT 'date',
  _sort_dir text DEFAULT 'desc'
)
RETURNS TABLE(
  item_id uuid,
  transaction_id uuid,
  customer_id uuid,
  customer_name text,
  customer_mobile text,
  customer_village text,
  entry_date date,
  product text,
  quantity numeric,
  unit text,
  rate numeric,
  item_amount numeric,
  transaction_amount numeric,
  transaction_payment numeric,
  transaction_remaining_due numeric,
  transaction_remarks text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_sort_clause text;
  v_product_pattern text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_offset := (GREATEST(_page, 1) - 1) * LEAST(GREATEST(_page_size, 1), 100);

  -- Build sort clause. Whitelist columns + directions to prevent SQL injection.
  v_sort_clause := CASE _sort_by
    WHEN 'amount' THEN 'item_amount'
    WHEN 'customer_name' THEN 'customer_name'
    ELSE 'entry_date'
  END;
  IF _sort_dir NOT IN ('asc', 'desc') THEN
    v_sort_dir := 'desc';
  END IF;

  v_product_pattern := CASE
    WHEN _product IS NULL OR BTRIM(_product) = '' THEN NULL
    ELSE '%' || LOWER(BTRIM(_product)) || '%'
  END;

  RETURN QUERY
  WITH matched AS (
    SELECT
      cti.id AS item_id,
      cti.transaction_id,
      ct.customer_id,
      c.name AS customer_name,
      c.mobile AS customer_mobile,
      c.village AS customer_village,
      ct.entry_date,
      cti.product,
      cti.quantity,
      cti.unit,
      cti.rate,
      cti.amount AS item_amount,
      ct.amount AS transaction_amount,
      ct.payment AS transaction_payment,
      ct.remaining_due AS transaction_remaining_due,
      ct.remarks AS transaction_remarks
    FROM public.customer_transaction_items cti
    JOIN public.customer_transactions ct ON ct.id = cti.transaction_id
    JOIN public.customers c ON c.id = ct.customer_id
    WHERE ct.entry_type IN ('purchase', 'sale')
      AND (_product_pattern IS NULL OR LOWER(cti.product) LIKE v_product_pattern)
      AND (_date_from IS NULL OR ct.entry_date >= _date_from)
      AND (_date_to IS NULL OR ct.entry_date <= _date_to)
      AND (_rate IS NULL OR cti.rate = _rate)
      AND (_quantity IS NULL OR cti.quantity = _quantity)
  ),
  counted AS (
    SELECT *, COUNT(*) OVER () AS total_count FROM matched
  )
  SELECT
    c.item_id, c.transaction_id, c.customer_id,
    c.customer_name, c.customer_mobile, c.customer_village,
    c.entry_date, c.product, c.quantity, c.unit, c.rate, c.item_amount,
    c.transaction_amount, c.transaction_payment, c.transaction_remaining_due,
    c.transaction_remarks, c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN v_sort_dir = 'asc'
         THEN CASE v_sort_clause
                WHEN 'amount'        THEN c.item_amount
                WHEN 'customer_name' THEN c.customer_name
                ELSE c.entry_date
              END
    END ASC NULLS LAST,
    CASE WHEN v_sort_dir = 'desc'
         THEN CASE v_sort_clause
                WHEN 'amount'        THEN c.item_amount
                WHEN 'customer_name' THEN c.customer_name
                ELSE c.entry_date
              END
    END DESC NULLS LAST,
    -- Stable tiebreaker: item_id (always secondary sort, same direction as primary)
    CASE WHEN v_sort_dir = 'asc'  THEN c.item_id END ASC NULLS LAST,
    CASE WHEN v_sort_dir = 'desc' THEN c.item_id END DESC NULLS LAST
  LIMIT LEAST(GREATEST(_page_size, 1), 100)
  OFFSET v_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.search_product_sales(text, date, date, numeric, numeric, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_product_sales(text, date, date, numeric, numeric, integer, integer, text, text) TO authenticated;

-- =====================================================================
-- aggregate_most_sold_products()
-- Top products by total quantity and amount in a date range. Used by
-- the optional "Most Sold Products" summary card on the product sales page.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.aggregate_most_sold_products(
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _limit integer DEFAULT 5
)
RETURNS TABLE(
  product text,
  total_quantity numeric,
  total_amount numeric,
  transaction_count bigint
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
    cti.product,
    SUM(cti.quantity)::numeric AS total_quantity,
    SUM(cti.amount)::numeric AS total_amount,
    COUNT(DISTINCT ct.id)::bigint AS transaction_count
  FROM public.customer_transaction_items cti
  JOIN public.customer_transactions ct ON ct.id = cti.transaction_id
  WHERE ct.entry_type IN ('purchase', 'sale')
    AND (_date_from IS NULL OR ct.entry_date >= _date_from)
    AND (_date_to IS NULL OR ct.entry_date <= _date_to)
  GROUP BY cti.product
  ORDER BY total_quantity DESC
  LIMIT LEAST(GREATEST(_limit, 1), 50);
END;
$$;
REVOKE ALL ON FUNCTION public.aggregate_most_sold_products(date, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aggregate_most_sold_products(date, date, integer) TO authenticated;
