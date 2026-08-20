-- Corrigindo o alerta do linter: revogar execução pública e garantir que apenas o sistema possa usar a função SECURITY DEFINER
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Revogar permissões desnecessárias na tabela user_roles
REVOKE ALL ON public.user_roles FROM PUBLIC;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Garantir GRANTs para clientes também
GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

-- Políticas para clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados podem ver clientes" ON public.clientes;
CREATE POLICY "Todos autenticados podem ver clientes" 
ON public.clientes FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Apenas gestores e diretores editam clientes" ON public.clientes;
CREATE POLICY "Apenas gestores e diretores editam clientes" 
ON public.clientes FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'diretor') OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'administrativo_financeiro'));
