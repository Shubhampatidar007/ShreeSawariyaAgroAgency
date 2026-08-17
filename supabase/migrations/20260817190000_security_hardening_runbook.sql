-- Security hardening based on the Shree Sawariya Agro Agency security runbooks.
-- Internal role helpers live outside the Data API surface; exposed RPCs are explicit.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (select auth.uid())
      AND role IN ('admin'::public.app_role, 'staff'::public.app_role)
  )
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated;

-- Move all staff RLS/storage checks to the non-exposed helper.
DO $$
DECLARE
  r record;
  using_expr text;
  check_expr text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE (qual IS NOT NULL AND qual LIKE '%is_staff(auth.uid())%')
       OR (with_check IS NOT NULL AND with_check LIKE '%is_staff(auth.uid())%')
  LOOP
    using_expr := CASE WHEN r.qual IS NULL THEN NULL ELSE replace(r.qual, 'is_staff(auth.uid())', '(select private.is_staff())') END;
    check_expr := CASE WHEN r.with_check IS NULL THEN NULL ELSE replace(r.with_check, 'is_staff(auth.uid())', '(select private.is_staff())') END;
    IF using_expr IS NOT NULL AND check_expr IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, using_expr, check_expr);
    ELSIF using_expr IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, using_expr);
    ELSE
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, check_expr);
    END IF;
  END LOOP;
END;
$$;

-- The public helper functions are no longer part of the Data API surface.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;

-- Explicit Data API grants: anonymous users only need public catalogue/CMS reads.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.products, public.cms_sections TO anon;

-- Keep authenticated access subject to RLS, but make the grant intentional.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Internal / maintenance RPCs must not be directly callable through the Data API.
REVOKE ALL ON FUNCTION public.cleanup_expired_zero_stock_inventory() FROM PUBLIC, anon, authenticated;

-- Business mutation RPCs are authenticated-only.
REVOKE ALL ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_khata_payment(uuid, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_khata_payment(uuid, numeric, text, date, text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid, numeric, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid, numeric, text, date, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_supplier_purchase(uuid, text, numeric, text, numeric, numeric, date, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_purchase(uuid, text, numeric, text, numeric, numeric, date, numeric, text) TO authenticated;

-- Convert exposed mutation RPCs to SECURITY INVOKER so RLS remains the final authorization boundary.
DO $$
DECLARE
  fn record;
  definition text;
BEGIN
  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('create_khata_sale','record_khata_payment','record_supplier_payment','record_supplier_purchase')
  LOOP
    definition := pg_get_functiondef(fn.oid);
    definition := replace(definition, 'SECURITY DEFINER', 'SECURITY INVOKER');
    definition := replace(definition, 'public.is_staff(auth.uid())', '(select private.is_staff())');
    EXECUTE definition;
  END LOOP;
END;
$$;

-- Prevent future public-schema objects from becoming accidentally reachable.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM PUBLIC, anon, authenticated;

-- Never grant admin to the first person who signs up. Existing admin roles are preserved;
-- new sign-ups always start as customers and must be promoted explicitly by an existing admin.
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,''),'@',1)),
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'village',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
