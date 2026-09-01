ALTER TABLE public.permission_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read permission keys" ON public.permission_keys FOR SELECT TO authenticated USING (true);