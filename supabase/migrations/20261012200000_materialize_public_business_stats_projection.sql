-- Expose only marketing fields without a SECURITY DEFINER view.
-- Keep the public projection synchronized by a trigger owned by the database, not client writes.
DROP VIEW IF EXISTS public.business_stats_public;

CREATE TABLE IF NOT EXISTS public.business_stats_public (
  id integer PRIMARY KEY,
  years_in_business integer NOT NULL DEFAULT 0,
  customers_served integer NOT NULL DEFAULT 0,
  services_offered integer NOT NULL DEFAULT 0
);

ALTER TABLE public.business_stats_public ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_stats_public_read ON public.business_stats_public;
CREATE POLICY business_stats_public_read
  ON public.business_stats_public
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.business_stats_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.business_stats_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_business_stats_public_projection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.business_stats_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.business_stats_public (
    id, years_in_business, customers_served, services_offered
  ) VALUES (
    NEW.id, NEW.years_in_business, NEW.customers_served, NEW.services_offered
  )
  ON CONFLICT (id) DO UPDATE SET
    years_in_business = EXCLUDED.years_in_business,
    customers_served = EXCLUDED.customers_served,
    services_offered = EXCLUDED.services_offered;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_business_stats_public_projection() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_business_stats_public_projection ON public.business_stats;
CREATE TRIGGER sync_business_stats_public_projection
AFTER INSERT OR UPDATE OF years_in_business, customers_served, services_offered OR DELETE
ON public.business_stats
FOR EACH ROW EXECUTE FUNCTION public.sync_business_stats_public_projection();

INSERT INTO public.business_stats_public (id, years_in_business, customers_served, services_offered)
SELECT id, years_in_business, customers_served, services_offered
FROM public.business_stats
ON CONFLICT (id) DO UPDATE SET
  years_in_business = EXCLUDED.years_in_business,
  customers_served = EXCLUDED.customers_served,
  services_offered = EXCLUDED.services_offered;
