CREATE TABLE public.business_stats (
  id integer PRIMARY KEY CHECK (id = 1),
  years_in_business integer NOT NULL DEFAULT 0 CHECK (years_in_business >= 0),
  customers_served integer NOT NULL DEFAULT 0 CHECK (customers_served >= 0),
  services_offered integer NOT NULL DEFAULT 0 CHECK (services_offered >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.business_stats (id)
VALUES (1);

GRANT SELECT ON public.business_stats TO anon, authenticated;
GRANT UPDATE ON public.business_stats TO authenticated;

ALTER TABLE public.business_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_stats_public_read"
ON public.business_stats
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "business_stats_admin_update"
ON public.business_stats
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER business_stats_touch_updated_at
BEFORE UPDATE ON public.business_stats
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
