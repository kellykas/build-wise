
-- Lock down search_path on helper functions and remove public execute
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Replace permissive company INSERT policy with one that requires the inserter
-- to immediately attach themselves via profile update (kept simple: only users
-- without a company can create one).
DROP POLICY IF EXISTS "auth create company" ON public.companies;
CREATE POLICY "create company when none"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.current_company_id() IS NULL);
