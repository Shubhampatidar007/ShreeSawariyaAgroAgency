CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  crop text NOT NULL DEFAULT '',
  quote text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY testimonials_public_read
  ON public.testimonials FOR SELECT TO anon
  USING (enabled = true);

CREATE POLICY testimonials_staff
  ON public.testimonials FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX testimonials_enabled_idx
  ON public.testimonials (enabled, created_at DESC);

CREATE TRIGGER t_testimonials_updated
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
