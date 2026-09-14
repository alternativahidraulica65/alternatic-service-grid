ALTER FUNCTION public.get_my_profile_id() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.dev_get_storage_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_os_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_distribuicao_status_os() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_faturamento_mensal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_profile_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_produtividade_tecnicos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_evento(uuid, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_os_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.processar_notificacoes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria_fornecedor() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.dev_get_storage_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_log_os_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_distribuicao_status_os() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_faturamento_mensal() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_produtividade_tecnicos() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_evento(uuid, text, text, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_os_status_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.processar_notificacoes() TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria_fornecedor() TO service_role;