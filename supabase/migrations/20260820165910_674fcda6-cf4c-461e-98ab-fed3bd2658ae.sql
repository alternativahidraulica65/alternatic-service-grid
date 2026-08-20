-- Revogar acesso público e autenticado à função interna de log
REVOKE EXECUTE ON FUNCTION public.fn_log_os_changes() FROM public;
REVOKE EXECUTE ON FUNCTION public.fn_log_os_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_os_changes() FROM anon;

-- Conceder execução apenas para o proprietário e service_role (usado pelo sistema/triggers)
GRANT EXECUTE ON FUNCTION public.fn_log_os_changes() TO service_role;

-- Definir search_path para evitar ataques de shadowing
ALTER FUNCTION public.fn_log_os_changes() SET search_path = public;
