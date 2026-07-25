DROP POLICY IF EXISTS "company documents storage read" ON storage.objects;
DROP POLICY IF EXISTS "company documents storage upload" ON storage.objects;
DROP POLICY IF EXISTS "company documents storage update" ON storage.objects;
DROP POLICY IF EXISTS "company documents storage delete" ON storage.objects;

CREATE POLICY "company documents storage read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "company documents storage upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "company documents storage update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "company documents storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);