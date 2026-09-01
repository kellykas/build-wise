-- Configurable email/notification templates per company
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_key   TEXT NOT NULL, -- e.g. 'task_assigned', 'task_status_changed', 'invoice_due', 'invoice_overdue', 'requisition_approval'
  subject        TEXT NOT NULL, -- email subject line, supports {{variables}}
  body           TEXT NOT NULL, -- notification body/message, supports {{variables}}
  enabled        BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, template_key)
);

-- RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read templates"
  ON public.notification_templates FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "admins manage templates"
  ON public.notification_templates FOR ALL
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

-- Seed default templates for all existing companies
INSERT INTO public.notification_templates (company_id, template_key, subject, body)
SELECT c.id, t.key, t.subject, t.body
FROM public.companies c
CROSS JOIN (VALUES
  ('task_assigned',     'New task assigned: {{taskName}}',           'You have been assigned to task "{{taskName}}"{{#if projectName}} in project {{projectName}}{{/if}}{{#if dueDate}} — due {{dueDate}}{{/if}}.'),
  ('task_status_changed', 'Task status updated: {{taskName}}',       'Task "{{taskName}}" status changed from "{{oldStatus}}" to "{{newStatus}}".'),     ('invoice_due',       'Invoice due soon: {{invoiceNumber}}',      'Invoice {{invoiceNumber}} for ${{amount}} is due on {{dueDate}}. Please ensure timely payment.'),
  ('invoice_overdue',   'Invoice overdue: {{invoiceNumber}}',        'Invoice {{invoiceNumber}} for ${{amount}} is {{daysOverdue}} day(s) overdue. Immediate action required.'),
  ('requisition_approval', 'Approval needed: {{requisitionNumber}}', 'Requisition {{requisitionNumber}}{{#if projectName}} for project "{{projectName}}"{{/if}} needs your approval.')
) AS t(key, subject, body)
ON CONFLICT (company_id, template_key) DO NOTHING;
