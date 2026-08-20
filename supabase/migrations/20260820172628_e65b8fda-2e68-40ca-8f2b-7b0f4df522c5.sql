
-- Fix Security Linter Issues
ALTER FUNCTION public.processar_notificacoes() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.processar_notificacoes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.processar_notificacoes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.processar_notificacoes() FROM anon;
GRANT EXECUTE ON FUNCTION public.processar_notificacoes() TO service_role;
