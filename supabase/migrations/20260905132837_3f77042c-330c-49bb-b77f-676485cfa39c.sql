DELETE FROM public.site_content a
USING public.site_content b
WHERE a.section = b.section
  AND a.key = b.key
  AND a.company_id IS NOT DISTINCT FROM b.company_id
  AND a.ctid > b.ctid;

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS site_content_global_uniq
  ON public.site_content (section, key) WHERE company_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS site_content_company_uniq
  ON public.site_content (section, key, company_id) WHERE company_id IS NOT NULL;