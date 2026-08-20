REVOKE EXECUTE ON FUNCTION public.dev_get_storage_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.dev_get_storage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated;