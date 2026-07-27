CREATE OR REPLACE FUNCTION public.is_staff_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'super_admin'::public.app_role)
    OR public.has_role(_user_id, 'company_owner'::public.app_role)
    OR public.has_role(_user_id, 'director'::public.app_role)
    OR public.has_role(_user_id, 'project_manager'::public.app_role)
    OR public.has_role(_user_id, 'site_engineer'::public.app_role)
    OR public.has_role(_user_id, 'accountant'::public.app_role)
    OR public.has_role(_user_id, 'hr_manager'::public.app_role)
    OR public.has_role(_user_id, 'procurement_officer'::public.app_role)
    OR public.has_role(_user_id, 'store_manager'::public.app_role)
    OR public.has_role(_user_id, 'employee'::public.app_role)
$function$;

GRANT EXECUTE ON FUNCTION public.is_staff_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "company documents storage upload" ON storage.objects;
CREATE POLICY "company documents storage upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_staff_user(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
);

DROP POLICY IF EXISTS "company documents storage update" ON storage.objects;
CREATE POLICY "company documents storage update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_staff_user(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_staff_user(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
);

DROP POLICY IF EXISTS "company documents storage delete" ON storage.objects;
CREATE POLICY "company documents storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_staff_user(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
);

DROP POLICY IF EXISTS "staff manage company documents" ON public.documents;
CREATE POLICY "staff manage company documents"
ON public.documents
FOR ALL
TO authenticated
USING (
  public.is_staff_user(auth.uid())
  AND company_id = public.current_company_id()
)
WITH CHECK (
  public.is_staff_user(auth.uid())
  AND company_id = public.current_company_id()
);