-- Security hardening: pin search_path for auth hooks to prevent search-path hijacking.
ALTER FUNCTION public.hook_before_user_created_rate_limit(jsonb)
  SET search_path TO public;

ALTER FUNCTION public.hook_password_verification_attempt(jsonb)
  SET search_path TO public;
