
-- Corrigindo segurança da função registrar_auditoria_fornecedor
ALTER FUNCTION public.registrar_auditoria_fornecedor() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria_fornecedor() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria_fornecedor() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria_fornecedor() FROM anon;

-- A função continua sendo SECURITY DEFINER e será executada via TRIGGER como OWNER
