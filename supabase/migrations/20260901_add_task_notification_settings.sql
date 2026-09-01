-- Per-company notification type settings (admin-configurable toggles)
CREATE TABLE IF NOT EXISTS public.notification_type_settings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type_key         TEXT NOT NULL, -- 'task_assigned', 'task_status_changed', 'invoice_due', 'invoice_overdue', 'requisition_approval'
  enabled          BOOLEAN NOT NULL DEFAULT true,
  send_email       BOOLEAN NOT NULL DEFAULT true,
  send_in_app      BOOLEAN NOT NULL DEFAULT true,
  recipient_roles  TEXT[] NOT NULL DEFAULT ARRAY['super_admin', 'company_owner', 'director'],
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, type_key)
);

-- RLS
ALTER TABLE public.notification_type_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read notification type settings"
  ON public.notification_type_settings FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "admins manage notification type settings"
  ON public.notification_type_settings FOR ALL
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
  WITH CHECK (company_id = public.current_company_id());

-- Seed default settings for all existing companies
INSERT INTO public.notification_type_settings (company_id, type_key, enabled, send_email, send_in_app, recipient_roles)
SELECT c.id, t.key, true, true, true, t.roles
FROM public.companies c
CROSS JOIN (VALUES
  ('task_assigned',         ARRAY['super_admin', 'company_owner', 'director', 'project_manager', 'site_engineer']),
  ('task_status_changed',   ARRAY['super_admin', 'company_owner', 'director', 'project_manager']),
  ('invoice_due',           ARRAY['super_admin', 'company_owner', 'director', 'accountant']),
  ('invoice_overdue',       ARRAY['super_admin', 'company_owner', 'director', 'accountant']),
  ('requisition_approval',  ARRAY['super_admin', 'company_owner', 'director', 'project_manager'])
) AS t(key, roles)
ON CONFLICT (company_id, type_key) DO NOTHING;

-- Add task-related fields to reminder_settings if not present
ALTER TABLE public.reminder_settings ADD COLUMN IF NOT EXISTS task_assignment_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.reminder_settings ADD COLUMN IF NOT EXISTS task_status_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.reminder_settings ADD COLUMN IF NOT EXISTS task_overdue_reminder_days INTEGER NOT NULL DEFAULT 1;
