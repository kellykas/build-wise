REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;