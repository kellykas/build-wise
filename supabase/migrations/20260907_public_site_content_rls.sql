-- Allow anonymous (public) users to read site_content rows
-- where company_id IS NULL (global/default content).
-- This is required for the public website pages to display CMS-edited content.

-- 1. Enable RLS on the table (idempotent)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing public read policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_content'
      AND policyname = 'Public can read global site content'
  ) THEN
    DROP POLICY "Public can read global site content" ON public.site_content;
  END IF;
END $$;

-- 3. Create the public read policy for global (company_id IS NULL) rows
CREATE POLICY "Public can read global site content"
  ON public.site_content
  FOR SELECT
  TO anon, authenticated
  USING (company_id IS NULL);

-- 4. Verify the policy was created
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'site_content';
