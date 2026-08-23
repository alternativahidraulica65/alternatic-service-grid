
-- Garantir privilégios na schema public para os papéis do Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- Grants específicos para tabelas críticas caso o global falhe
GRANT SELECT ON public.usuarios TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.checklist_templates TO authenticated;
GRANT SELECT ON public.tipos_equipamentos TO authenticated;
GRANT SELECT ON public.ordens_servico TO authenticated;
GRANT SELECT ON public.clientes TO authenticated;
