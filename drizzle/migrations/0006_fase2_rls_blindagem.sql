CREATE OR REPLACE FUNCTION public.is_dir_fin(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('diretor','financeiro','administrativo_financeiro'));
$$;

-- os_custos
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.os_custos;
CREATE POLICY os_custos_select ON public.os_custos FOR SELECT TO authenticated
  USING (public.is_dir_fin(auth.uid()) OR public.has_role(auth.uid(),'gestor'));
CREATE POLICY os_custos_insert ON public.os_custos FOR INSERT TO authenticated
  WITH CHECK (public.is_dir_fin(auth.uid()) OR public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'operador'));
CREATE POLICY os_custos_update ON public.os_custos FOR UPDATE TO authenticated
  USING (public.is_dir_fin(auth.uid()) OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.is_dir_fin(auth.uid()) OR public.has_role(auth.uid(),'gestor'));
CREATE POLICY os_custos_delete ON public.os_custos FOR DELETE TO authenticated
  USING (public.is_dir_fin(auth.uid()));

-- orcamentos (legado)
DROP POLICY IF EXISTS "Authenticated users can manage orcamentos" ON public.orcamentos;
CREATE POLICY orcamentos_dir_fin ON public.orcamentos FOR ALL TO authenticated
  USING (public.is_dir_fin(auth.uid())) WITH CHECK (public.is_dir_fin(auth.uid()));

-- custo-hora sem salário bruto
DROP FUNCTION IF EXISTS public.custo_hora_usuarios(uuid[]);
CREATE FUNCTION public.custo_hora_usuarios(p_ids uuid[])
RETURNS TABLE(usuario_id uuid, nome text, custo_hora numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT u.id, u.nome, round(coalesce(c.salario,0) * 1.65 / 220, 2)
  FROM public.usuarios u
  LEFT JOIN public.colaboradores c ON c.usuario_id = u.id AND c.ativo
  WHERE u.id = ANY(p_ids)
    AND (public.is_dir_fin(auth.uid()) OR public.has_role(auth.uid(),'gestor'));
$$;
REVOKE ALL ON FUNCTION public.custo_hora_usuarios(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.custo_hora_usuarios(uuid[]) TO authenticated;

-- Storage: os-assets
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON storage.objects;
CREATE POLICY os_assets_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'os-assets' AND (public.is_dir_fin(auth.uid()) OR public.has_role(auth.uid(),'gestor')));

-- Storage: avatares privados deixam de ser públicos
DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
CREATE POLICY avatar_authenticated_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-profiles-private');