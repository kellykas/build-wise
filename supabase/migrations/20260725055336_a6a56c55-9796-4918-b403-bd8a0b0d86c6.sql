CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Membre du projet',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company access project members" ON public.project_members;
CREATE POLICY "company access project members"
ON public.project_members
FOR ALL
TO authenticated
USING (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
)
WITH CHECK (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
);

DROP POLICY IF EXISTS "clients read own project memberships" ON public.project_members;
CREATE POLICY "clients read own project memberships"
ON public.project_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "company access projects" ON public.projects;
DROP POLICY IF EXISTS "staff manage company projects" ON public.projects;
DROP POLICY IF EXISTS "clients read own projects" ON public.projects;
CREATE POLICY "staff manage company projects"
ON public.projects
FOR ALL
TO authenticated
USING (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
)
WITH CHECK (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
);
CREATE POLICY "clients read own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_role(auth.uid(), 'client'::public.app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = projects.client_id
        AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "company access clients" ON public.clients;
DROP POLICY IF EXISTS "staff manage company clients" ON public.clients;
DROP POLICY IF EXISTS "clients read own client profile" ON public.clients;
CREATE POLICY "staff manage company clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
)
WITH CHECK (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
);
CREATE POLICY "clients read own client profile"
ON public.clients
FOR SELECT
TO authenticated
USING (
  company_id = public.current_company_id()
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "company access documents" ON public.documents;
DROP POLICY IF EXISTS "staff manage company documents" ON public.documents;
DROP POLICY IF EXISTS "clients read own progress documents" ON public.documents;
CREATE POLICY "staff manage company documents"
ON public.documents
FOR ALL
TO authenticated
USING (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
)
WITH CHECK (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
);
CREATE POLICY "clients read own progress documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  company_id = public.current_company_id()
  AND folder = 'Progression client'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = documents.project_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "company access invoices" ON public.invoices;
DROP POLICY IF EXISTS "staff manage company invoices" ON public.invoices;
DROP POLICY IF EXISTS "clients read own project invoices" ON public.invoices;
CREATE POLICY "staff manage company invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
)
WITH CHECK (
  company_id = public.current_company_id()
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
);
CREATE POLICY "clients read own project invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = invoices.project_id
      AND c.user_id = auth.uid()
  )
);

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
  AND (
    (
      NOT public.has_role(auth.uid(), 'client'::public.app_role)
      AND (storage.foldername(name))[1] = public.current_company_id()::text
    )
    OR (
      public.has_role(auth.uid(), 'client'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.projects p ON p.id = d.project_id
        JOIN public.clients c ON c.id = p.client_id
        WHERE d.storage_path = storage.objects.name
          AND d.folder = 'Progression client'
          AND c.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "company documents storage upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "company documents storage update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(name))[1] = public.current_company_id()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "company documents storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);