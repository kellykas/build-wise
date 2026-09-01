REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_permission(uuid, text) FROM anon;