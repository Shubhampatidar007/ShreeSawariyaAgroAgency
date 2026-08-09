CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  placement text NOT NULL DEFAULT 'Homepage hero',
  audience text NOT NULL DEFAULT 'All visitors',
  status text NOT NULL DEFAULT 'scheduled',
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  runs_until date NOT NULL DEFAULT (CURRENT_DATE + 30),
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ads_staff ON public.advertisements FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER t_ads_upd BEFORE UPDATE ON public.advertisements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  account text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'allowed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_logs TO authenticated;
GRANT ALL ON public.security_logs TO service_role;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_logs_staff_read ON public.security_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY security_logs_insert ON public.security_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'manual',
  size text NOT NULL DEFAULT '—',
  destination text NOT NULL DEFAULT 'Cloud vault',
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY backups_staff ON public.backups FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));