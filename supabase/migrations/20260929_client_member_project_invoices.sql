-- A client linked to a project via project_members (the "Agents attachés"
-- dialog) could see the project but not its invoices, because the invoices
-- policy only covered the projects.client_id → clients.user_id path.
-- Mirror the documents policy by also allowing the project_members path.
DROP POLICY IF EXISTS "clients read own project invoices" ON public.invoices;
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
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = invoices.project_id
      AND pm.user_id = auth.uid()
  )
);
