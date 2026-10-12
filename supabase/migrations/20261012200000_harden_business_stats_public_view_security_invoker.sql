-- This projection exposes only explicitly public marketing fields; do not use invoker rights here,
-- because the anon role is intentionally not granted table-level access to the base table.
-- The fixed projection contains no caller-controlled expressions or private columns.
ALTER VIEW public.business_stats_public RESET (security_invoker);
ALTER VIEW public.business_stats_public SET (security_barrier = true);
