DROP POLICY IF EXISTS "company documents storage upload" ON storage.objects;
CREATE POLICY "company documents storage upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
);

DROP POLICY IF EXISTS "company documents storage update" ON storage.objects;
CREATE POLICY "company documents storage update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
);

DROP POLICY IF EXISTS "company documents storage delete" ON storage.objects;
CREATE POLICY "company documents storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(storage.objects.name))[1] = (public.current_company_id())::text
);