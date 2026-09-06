-- Enums
DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('draft','sent','under_review','accepted','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM ('requested','confirmed','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: is the current user linked to this client row?
CREATE OR REPLACE FUNCTION public.is_client_of(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id AND c.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_client_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_client_of(uuid) TO authenticated, service_role;

-- ============ QUOTES ============
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_number text,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status public.quote_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  notes text,
  client_response_note text,
  responded_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_staff_all" ON public.quotes FOR ALL TO authenticated
  USING (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id())
  WITH CHECK (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "quotes_client_select" ON public.quotes FOR SELECT TO authenticated
  USING (public.is_client_of(client_id) AND status <> 'draft');

CREATE POLICY "quotes_client_respond" ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_client_of(client_id) AND status IN ('sent','under_review'))
  WITH CHECK (public.is_client_of(client_id));

CREATE TRIGGER quotes_set_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS quotes_company_idx ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS quotes_client_idx ON public.quotes(client_id);

-- ============ QUOTE ITEMS ============
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  unit text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_items_staff_all" ON public.quote_items FOR ALL TO authenticated
  USING (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id())
  WITH CHECK (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "quote_items_client_select" ON public.quote_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_items.quote_id
      AND public.is_client_of(q.client_id)
      AND q.status <> 'draft'
  ));

CREATE TRIGGER quote_items_set_updated BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS quote_items_quote_idx ON public.quote_items(quote_id);

-- ============ APPOINTMENTS ============
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  status public.appointment_status NOT NULL DEFAULT 'requested',
  staff_note text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_staff_all" ON public.appointments FOR ALL TO authenticated
  USING (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id())
  WITH CHECK (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "appointments_client_select" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_client_of(client_id));

CREATE POLICY "appointments_client_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_client_of(client_id) AND status = 'requested');

CREATE POLICY "appointments_client_cancel" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_client_of(client_id) AND status IN ('requested','confirmed'))
  WITH CHECK (public.is_client_of(client_id));

CREATE TRIGGER appointments_set_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS appointments_company_idx ON public.appointments(company_id);
CREATE INDEX IF NOT EXISTS appointments_client_idx ON public.appointments(client_id);

-- ============ INVOICE PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'manual',
  reference text,
  note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_payments_staff_all" ON public.invoice_payments FOR ALL TO authenticated
  USING (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id())
  WITH CHECK (public.is_staff_user(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "invoice_payments_client_select" ON public.invoice_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_payments.invoice_id AND public.is_client_of(i.client_id)
  ));

CREATE POLICY "invoice_payments_client_insert" ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_payments.invoice_id AND public.is_client_of(i.client_id)
  ));

CREATE TRIGGER invoice_payments_set_updated BEFORE UPDATE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON public.invoice_payments(invoice_id);

-- Realtime for live notification status updates
ALTER TABLE public.notification_log REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_log;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
