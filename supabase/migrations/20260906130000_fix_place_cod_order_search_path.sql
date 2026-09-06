-- The search_path pinned on place_cod_order() excluded the `extensions` schema,
-- where pgcrypto's digest() lives. Every guest checkout call was failing with:
--   ERROR: function digest(text, unknown) does not exist
-- This restores extensions to the search_path so checkout works again.
ALTER FUNCTION public.place_cod_order(text, text, text, text, text, jsonb, text, text)
  SET search_path TO pg_catalog, public, extensions, private;
