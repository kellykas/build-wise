-- Public bucket for CMS site imagery (hero background, etc.).
--
-- The bucket itself (id: 'site-images', public: true) is created through the
-- Storage dashboard/API — it is the row in storage.buckets, not SQL. These
-- policies make objects in that bucket:
--   * readable by anonymous visitors (the marketing site shows the images),
--   * writable/removable by any staff user (site editors upload from the
--     Site Editor — Éditeur du site → Section Hero).
-- Replaying this file is safe: policies are dropped and recreated.

DROP POLICY IF EXISTS public_site_images_read ON storage.objects;
DROP POLICY IF EXISTS staff_site_images_insert ON storage.objects;
DROP POLICY IF EXISTS staff_site_images_update ON storage.objects;
DROP POLICY IF EXISTS staff_site_images_delete ON storage.objects;

CREATE POLICY public_site_images_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'site-images');

CREATE POLICY staff_site_images_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'site-images' AND public.is_staff_user(auth.uid()));

CREATE POLICY staff_site_images_update
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'site-images' AND public.is_staff_user(auth.uid()))
  WITH CHECK (bucket_id = 'site-images' AND public.is_staff_user(auth.uid()));

CREATE POLICY staff_site_images_delete
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'site-images' AND public.is_staff_user(auth.uid()));
