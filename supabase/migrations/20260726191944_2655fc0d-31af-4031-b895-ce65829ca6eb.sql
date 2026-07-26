CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_company_created_idx ON public.audit_logs (company_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON public.audit_logs (action);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read company audit"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'company_owner'::app_role)
      OR public.has_role(auth.uid(), 'director'::app_role)
    )
  );

CREATE POLICY "users insert their own audit entries"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());