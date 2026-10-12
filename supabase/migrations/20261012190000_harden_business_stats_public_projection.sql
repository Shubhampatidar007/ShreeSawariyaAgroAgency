-- Limit anonymous reads to the public marketing fields. Keep authenticated admin access to the base table.
CREATE OR REPLACE VIEW public.business_stats_public
WITH (security_barrier = true, security_invoker = true)
AS
SELECT id, years_in_business, customers_served, services_offered
FROM public.business_stats;

REVOKE SELECT ON TABLE public.business_stats FROM anon;
REVOKE SELECT (id, years_in_business, customers_served, services_offered, updated_at) ON TABLE public.business_stats FROM anon;
-- Keep legacy storefront builds functional without exposing updated_at.
GRANT SELECT (years_in_business, customers_served, services_offered) ON TABLE public.business_stats TO anon;
GRANT SELECT ON TABLE public.business_stats_public TO anon;
GRANT SELECT ON TABLE public.business_stats_public TO authenticated;

-- Preserve the current private backup bucket and image upload restrictions.
UPDATE storage.buckets
SET public = false
WHERE id = 'shop-backups';

UPDATE storage.buckets
SET public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']::text[]
WHERE id = 'product-images';

UPDATE storage.buckets
SET public = true,
    file_size_limit = 209715,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']::text[]
WHERE id = 'testimonial-images';
