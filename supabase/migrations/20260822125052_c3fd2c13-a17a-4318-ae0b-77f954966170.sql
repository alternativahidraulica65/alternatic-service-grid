
-- Habilitar RLS na tabela tipos_equipamentos
ALTER TABLE public.tipos_equipamentos ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública (conforme GRANT SELECT anterior)
CREATE POLICY "Leitura pública de tipos de equipamentos"
ON public.tipos_equipamentos
FOR SELECT
TO public
USING (true);

-- Criar política de escrita para autenticados
CREATE POLICY "Escrita para autenticados"
ON public.tipos_equipamentos
FOR ALL
TO authenticated
USING (true);
