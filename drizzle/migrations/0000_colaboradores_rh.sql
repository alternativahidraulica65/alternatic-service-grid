CREATE OR REPLACE FUNCTION public.is_financeiro(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'administrativo_financeiro');
$$;
REVOKE EXECUTE ON FUNCTION public.is_financeiro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_financeiro(uuid) TO authenticated, service_role;

CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  matricula text,
  cpf text UNIQUE,
  rg text,
  data_nascimento date,
  telefone text,
  email text,
  endereco text,
  cargo text,
  setor text,
  data_admissao date,
  salario numeric,
  tipo_contrato text DEFAULT 'CLT',
  dias_experiencia integer DEFAULT 90,
  status text NOT NULL DEFAULT 'ativo',
  foto_path text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.colaborador_aso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'Periódico',
  data_exame date NOT NULL,
  validade date,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.colaborador_certificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  norma text NOT NULL,
  descricao text,
  emissao date,
  validade date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.colaborador_ferias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  inicio date NOT NULL,
  fim date NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.colaborador_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'Outros',
  nome text NOT NULL,
  storage_path text NOT NULL,
  tamanho bigint,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores, public.colaborador_aso, public.colaborador_certificacoes, public.colaborador_ferias, public.colaborador_anexos TO authenticated;
GRANT ALL ON public.colaboradores, public.colaborador_aso, public.colaborador_certificacoes, public.colaborador_ferias, public.colaborador_anexos TO service_role;

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_aso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_certificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente financeiro" ON public.colaboradores FOR ALL TO authenticated USING (public.is_financeiro(auth.uid())) WITH CHECK (public.is_financeiro(auth.uid()));
CREATE POLICY "Somente financeiro" ON public.colaborador_aso FOR ALL TO authenticated USING (public.is_financeiro(auth.uid())) WITH CHECK (public.is_financeiro(auth.uid()));
CREATE POLICY "Somente financeiro" ON public.colaborador_certificacoes FOR ALL TO authenticated USING (public.is_financeiro(auth.uid())) WITH CHECK (public.is_financeiro(auth.uid()));
CREATE POLICY "Somente financeiro" ON public.colaborador_ferias FOR ALL TO authenticated USING (public.is_financeiro(auth.uid())) WITH CHECK (public.is_financeiro(auth.uid()));
CREATE POLICY "Somente financeiro" ON public.colaborador_anexos FOR ALL TO authenticated USING (public.is_financeiro(auth.uid())) WITH CHECK (public.is_financeiro(auth.uid()));

CREATE TRIGGER trg_colaboradores_updated BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE POLICY "Colaboradores docs financeiro select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'colaboradores-docs' AND public.is_financeiro(auth.uid()));
CREATE POLICY "Colaboradores docs financeiro insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'colaboradores-docs' AND public.is_financeiro(auth.uid()));
CREATE POLICY "Colaboradores docs financeiro delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'colaboradores-docs' AND public.is_financeiro(auth.uid()));

NOTIFY pgrst, 'reload schema';