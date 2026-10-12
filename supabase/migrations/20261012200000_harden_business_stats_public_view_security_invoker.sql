-- Defense in depth: the public stats projection must honor the querying role's grants and RLS.
ALTER VIEW public.business_stats_public
  SET (security_invoker = true, security_barrier = true);
