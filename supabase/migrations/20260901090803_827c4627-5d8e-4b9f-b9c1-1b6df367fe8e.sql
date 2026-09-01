CREATE TABLE public.notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  recipient_id uuid REFERENCES public.profiles(id),
  knock_message_id text,
  knock_workflow text,
  channel text,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their company's notification logs" ON public.notification_log FOR SELECT TO authenticated USING (company_id = public.current_company_id() OR recipient_id = auth.uid());
CREATE TRIGGER notification_log_set_updated BEFORE UPDATE ON public.notification_log FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_log;