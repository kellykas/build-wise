DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated staff can view inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated staff can update inquiries" ON public.inquiries;

CREATE POLICY "Visitors can submit complete inquiries"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(full_name)) > 0
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(trim(message)) > 0
);

CREATE POLICY "Authorized staff can view inquiries"
ON public.inquiries
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'company_owner'::public.app_role)
  OR public.has_role(auth.uid(), 'director'::public.app_role)
  OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
);

CREATE POLICY "Authorized staff can update inquiries"
ON public.inquiries
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'company_owner'::public.app_role)
  OR public.has_role(auth.uid(), 'director'::public.app_role)
  OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'company_owner'::public.app_role)
  OR public.has_role(auth.uid(), 'director'::public.app_role)
  OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
);