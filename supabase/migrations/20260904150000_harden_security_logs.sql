-- Prevent customers from forging security/audit log entries.
DROP POLICY IF EXISTS security_logs_insert ON public.security_logs;

CREATE POLICY security_logs_staff_insert
  ON public.security_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
