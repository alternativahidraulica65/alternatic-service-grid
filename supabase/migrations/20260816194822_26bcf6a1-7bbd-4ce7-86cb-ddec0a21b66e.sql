
-- Garantir que a tabela usuarios tenha as colunas necessárias e RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'username') THEN
        ALTER TABLE public.usuarios ADD COLUMN username text UNIQUE;
    END IF;
END $$;

-- Criar função para verificar role de forma segura
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    from public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Corrigir linter: Restringir acesso à função has_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- Garantir permissões na user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Atribuir perfil 'diretor' ao usuário DEV
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'diretor'::app_role
FROM auth.users
WHERE email = 'teste.dev@alternativahidraulica.local'
ON CONFLICT (user_id, role) DO NOTHING;

-- Configurar RLS na tabela ordens_servico
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Diretores podem tudo na OS" ON public.ordens_servico;
CREATE POLICY "Diretores podem tudo na OS"
ON public.ordens_servico
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'diretor'));

DROP POLICY IF EXISTS "Operadores veem suas próprias OS" ON public.ordens_servico;
CREATE POLICY "Operadores veem suas próprias OS"
ON public.ordens_servico
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'operador') 
    AND tecnico_id = auth.uid()
);

-- Políticas para Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Diretores veem todos os clientes" ON public.clientes;
CREATE POLICY "Diretores veem todos os clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'diretor') OR public.has_role(auth.uid(), 'administrativo_financeiro'));

-- Garantir grants básicos para as tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT SELECT ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
