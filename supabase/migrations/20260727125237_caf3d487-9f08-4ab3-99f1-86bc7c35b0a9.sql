DROP POLICY IF EXISTS "company documents storage read" ON storage.objects;
CREATE POLICY "company documents storage read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (
      NOT public.has_role(auth.uid(), 'client'::public.app_role)
      AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
    )
    OR (
      public.has_role(auth.uid(), 'client'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.documents d
        LEFT JOIN public.projects p ON p.id = d.project_id
        LEFT JOIN public.clients c ON c.id = p.client_id
        LEFT JOIN public.project_members pm ON pm.project_id = d.project_id AND pm.user_id = auth.uid()
        WHERE d.storage_path = storage.objects.name
          AND d.folder = 'Progression client'
          AND d.company_id = public.current_company_id()
          AND (c.user_id = auth.uid() OR pm.user_id = auth.uid())
      )
    )
  )
);