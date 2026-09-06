-- Security hardening: public role-check helpers accept an arbitrary user UUID.
-- Current RLS policies use private.is_staff(), so these public helpers are not needed by clients.
-- Restrict direct execution to prevent authenticated users from probing arbitrary users' roles.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;
