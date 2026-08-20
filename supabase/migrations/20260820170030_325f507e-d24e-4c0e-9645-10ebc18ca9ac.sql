-- Revogar acesso público/anon às RPCs
REVOKE EXECUTE ON FUNCTION public.get_faturamento_mensal() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_produtividade_tecnicos() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_distribuicao_status_os() FROM anon, public;

-- Garantir acesso apenas para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_faturamento_mensal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_produtividade_tecnicos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distribuicao_status_os() TO authenticated;
