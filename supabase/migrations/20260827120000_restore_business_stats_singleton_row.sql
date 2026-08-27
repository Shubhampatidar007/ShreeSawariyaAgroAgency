INSERT INTO public.business_stats (id, years_in_business, customers_served, services_offered)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
