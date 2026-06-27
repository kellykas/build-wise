
-- Enums
CREATE TYPE public.requisition_status AS ENUM ('draft','pending_pricing','in_progress','closed','rejected');
CREATE TYPE public.requisition_line_status AS ENUM ('pending','priced','validated','disbursed','rejected');
CREATE TYPE public.internal_notification_type AS ENUM ('info','task','requisition','approval','urgent');
CREATE TYPE public.task_role AS ENUM ('executor','supervisor','approver');

-- Requisitions
CREATE TABLE public.requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference text NOT NULL,
  title text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  stage text,
  classeur text,
  demandeur_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tarificateur_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  validateur_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  caissier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.requisition_status NOT NULL DEFAULT 'draft',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisitions TO authenticated;
GRANT ALL ON public.requisitions TO service_role;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_requisitions" ON public.requisitions FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_requisitions_updated BEFORE UPDATE ON public.requisitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Requisition lines
CREATE TABLE public.requisition_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requisition_id uuid NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  besoin text NOT NULL,
  unit text,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2),
  status public.requisition_line_status NOT NULL DEFAULT 'pending',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisition_lines TO authenticated;
GRANT ALL ON public.requisition_lines TO service_role;
ALTER TABLE public.requisition_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_requisition_lines" ON public.requisition_lines FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_requisition_lines_updated BEFORE UPDATE ON public.requisition_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_req_lines_req ON public.requisition_lines(requisition_id);

-- Disbursements
CREATE TABLE public.requisition_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requisition_id uuid NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  line_id uuid REFERENCES public.requisition_lines(id) ON DELETE SET NULL,
  operation text,
  besoin text,
  quantity numeric(12,3),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  beneficiary text,
  paid_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisition_disbursements TO authenticated;
GRANT ALL ON public.requisition_disbursements TO service_role;
ALTER TABLE public.requisition_disbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_req_disb" ON public.requisition_disbursements FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Internal notifications (per-recipient inbox)
CREATE TABLE public.internal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type public.internal_notification_type NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_notifications TO authenticated;
GRANT ALL ON public.internal_notifications TO service_role;
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;
-- Tenant scope + recipient-or-sender visibility
CREATE POLICY "internal_notif_select" ON public.internal_notifications FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND (recipient_id = auth.uid() OR sender_id = auth.uid()));
CREATE POLICY "internal_notif_insert" ON public.internal_notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND sender_id = auth.uid());
CREATE POLICY "internal_notif_update" ON public.internal_notifications FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND recipient_id = auth.uid())
  WITH CHECK (company_id = public.current_company_id() AND recipient_id = auth.uid());
CREATE INDEX idx_internal_notif_recipient ON public.internal_notifications(recipient_id, read_at);

-- Task assignments
CREATE TABLE public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.task_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_task_assignments" ON public.task_assignments FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX idx_task_assign_user ON public.task_assignments(user_id, role);
