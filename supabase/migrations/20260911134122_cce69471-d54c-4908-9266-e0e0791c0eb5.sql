DROP POLICY IF EXISTS "Acesso total para usuários autenticados em vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados em vendedor_empresas" ON public.vendedor_empresas;

CREATE POLICY "Diretor e financeiro gerenciam vendedores"
ON public.vendedores
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
)
WITH CHECK (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
);

CREATE POLICY "Diretor e financeiro gerenciam vendedor_empresas"
ON public.vendedor_empresas
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
)
WITH CHECK (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
);