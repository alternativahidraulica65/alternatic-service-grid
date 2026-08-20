-- Garantir que a função has_role existe e funciona sem recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas para ordens_servico
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Diretores e Gestores podem tudo" ON public.ordens_servico;
CREATE POLICY "Diretores e Gestores podem tudo" 
ON public.ordens_servico FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'diretor') OR public.has_role(auth.uid(), 'gestor'));

DROP POLICY IF EXISTS "Operadores veem suas próprias OS" ON public.ordens_servico;
CREATE POLICY "Operadores veem suas próprias OS" 
ON public.ordens_servico FOR SELECT 
TO authenticated 
USING (tecnico_id = auth.uid());

DROP POLICY IF EXISTS "Financeiro vê todas as OS" ON public.ordens_servico;
CREATE POLICY "Financeiro vê todas as OS" 
ON public.ordens_servico FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'administrativo_financeiro'));

-- Permissões básicas
GRANT SELECT, INSERT, UPDATE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
