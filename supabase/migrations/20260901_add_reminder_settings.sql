-- Per-company reminder settings (admin-configurable intervals)
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  -- Days before due date to send "due soon" reminder (e.g., 3 = 3 days before)
  due_soon_days    INTEGER NOT NULL DEFAULT 3,
  -- Days after due date to send first overdue reminder (e.g., 1 = day after)
  overdue_first_days   INTEGER NOT NULL DEFAULT 1,
  -- Days after due date to send follow-up (e.g., 7)
  overdue_followup_days INTEGER NOT NULL DEFAULT 7,
  -- Days after due date to send final notice (e.g., 30)
  overdue_final_days   INTEGER NOT NULL DEFAULT 30,
  -- Which roles receive email reminders
  recipient_roles  TEXT[] NOT NULL DEFAULT ARRAY['super_admin', 'company_owner', 'director', 'accountant'],
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage reminder settings"
  ON public.reminder_settings FOR ALL
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'company_owner', 'director')
        AND company_id = public.current_company_id()
    )
  )
  WITH CHECK (
    company_id = public.current_company_id()
  );

-- Default settings for existing companies
INSERT INTO public.reminder_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT DO NOTHING;
