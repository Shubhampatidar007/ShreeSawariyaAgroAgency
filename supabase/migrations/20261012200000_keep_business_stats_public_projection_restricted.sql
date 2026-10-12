-- The public projection is a fixed list of explicitly public marketing fields.
-- Keep the view owner as its execution context so anonymous readers do not need base-table grants.
-- security_barrier prevents unsafe predicate reordering across the view boundary.
ALTER VIEW public.business_stats_public RESET (security_invoker);
ALTER VIEW public.business_stats_public SET (security_barrier = true);
