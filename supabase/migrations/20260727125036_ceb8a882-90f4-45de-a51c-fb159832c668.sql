GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.project_members TO service_role;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

DROP POLICY IF EXISTS "clients insert own progress documents" ON public.documents;
DROP POLICY IF EXISTS "clients read own progress documents" ON public.documents;
CREATE POLICY "clients read own progress documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  company_id = public.current_company_id()
  AND folder = 'Progression client'
  AND public.has_role(auth.uid(), 'client'::public.app_role)
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = documents.project_id
        AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = documents.project_id
        AND pm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "clients insert own progress documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND folder = 'Progression client'
  AND public.has_role(auth.uid(), 'client'::public.app_role)
  AND project_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = documents.project_id
        AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = documents.project_id
        AND pm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "client progress photos storage upload" ON storage.objects;
CREATE POLICY "client progress photos storage upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
  AND (storage.foldername(storage.objects.name))[3] = 'progress'
  AND (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = ((storage.foldername(storage.objects.name))[2])::uuid
        AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = ((storage.foldername(storage.objects.name))[2])::uuid
        AND pm.user_id = auth.uid()
    )
  )
);