COMMENT ON TABLE public.colaboradores IS 'Cadastro de colaboradores (RH) - acesso exclusivo Financeiro';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores, public.colaborador_aso, public.colaborador_certificacoes, public.colaborador_ferias, public.colaborador_anexos TO authenticated;
GRANT ALL ON public.colaboradores, public.colaborador_aso, public.colaborador_certificacoes, public.colaborador_ferias, public.colaborador_anexos TO service_role;
NOTIFY pgrst, 'reload schema';