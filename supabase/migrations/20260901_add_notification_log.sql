-- Notification log: tracks every automated notification sent, with delivery status
CREATE TABLE IF NOT EXISTS public.notification_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Who sent it (null = system/automated)
  sender_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Who received it
  recipient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Notification classification
  type            TEXT NOT NULL,           -- 'info' | 'task' | 'requisition' | 'approval' | 'urgent'
  template_key    TEXT,                    -- e.g. 'task_assigned', 'invoice_overdue', etc.
  title           TEXT NOT NULL,
  message         TEXT,
  link            TEXT,
  -- Delivery tracking
  channel         TEXT NOT NULL DEFAULT 'in_app',  -- 'in_app' | 'email' | 'knock'
  status          TEXT NOT NULL DEFAULT 'sent',     -- 'sent' | 'delivered' | 'read' | 'failed'
  error_message   TEXT,                             -- If delivery failed
  -- Metadata
  metadata        JSONB DEFAULT '{}'::jsonb,        -- Arbitrary data (taskName, invoiceNumber, etc.)
  created_at      TIMESTAMPTZ DEFAULT now(),
  read_at         TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Admins and owners can read all company logs
CREATE POLICY "admins read notification log"
  ON public.notification_log FOR SELECT
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'company_owner', 'director')
        AND company_id = public.current_company_id()
    )
  );

-- System can insert log entries (via authenticated users creating notifications)
CREATE POLICY "system insert notification log"
  ON public.notification_log FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.current_company_id());

-- System can update delivery status
CREATE POLICY "system update notification log"
  ON public.notification_log FOR UPDATE
  TO authenticated
  USING (company_id = public.current_company_id());

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notification_log_company_created
  ON public.notification_log (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_recipient
  ON public.notification_log (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_type
  ON public.notification_log (company_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_status
  ON public.notification_log (company_id, status, created_at DESC);
