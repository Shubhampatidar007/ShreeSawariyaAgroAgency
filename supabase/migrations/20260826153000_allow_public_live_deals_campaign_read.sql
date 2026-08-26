CREATE POLICY ads_public_live_deals_read
  ON public.advertisements
  FOR SELECT
  TO anon
  USING (
    placement = 'Deals'
    AND status = 'live'
    AND starts_on <= CURRENT_DATE
    AND runs_until >= CURRENT_DATE
  );
