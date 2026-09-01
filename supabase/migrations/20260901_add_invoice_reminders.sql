-- Track which invoice reminders have been sent to avoid duplicates
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id     UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reminder_type  TEXT NOT NULL, -- 'due_soon', 'overdue_day_1', 'overdue_day_7', 'overdue_day_30', 'manual'
  sent_at        TIMESTAMPTZ DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invoice_id, user_id, reminder_type)
);

-- RLS
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read reminders"
  ON public.invoice_reminders FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "system insert reminders"
  ON public.invoice_reminders FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.current_company_id());

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_user
  ON public.invoice_reminders (invoice_id, user_id, reminder_type);
