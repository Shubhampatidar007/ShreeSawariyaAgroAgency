-- Security hardening: public signup must never bootstrap an admin role.
-- The first/owner admin must be created explicitly by a trusted deployment/admin process.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, mobile, village, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'village',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Every self-service signup is a customer. Never infer admin privilege
  -- from whether an admin currently exists.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Keep role checks server-side through RLS/security-definer helpers.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
