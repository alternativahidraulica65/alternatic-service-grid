-- 1) Empresa emissora: campos para o cabeçalho da proposta
ALTER TABLE public.empresas_emissoras
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS site text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_emissoras TO authenticated;
GRANT ALL ON public.empresas_emissoras TO service_role;

DROP POLICY IF EXISTS "empresas_gestao_diretoria" ON public.empresas_emissoras;
CREATE POLICY "empresas_gestao_diretoria" ON public.empresas_emissoras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'))
  WITH CHECK (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'));

-- 2) Configurações por empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas_emissoras(id) ON DELETE CASCADE,
  imposto_padrao numeric NOT NULL DEFAULT 0,
  margem_padrao numeric NOT NULL DEFAULT 30,
  prazo_entrega_padrao integer NOT NULL DEFAULT 7,
  prazo_garantia_padrao integer NOT NULL DEFAULT 90,
  validade_orcamento_dias integer NOT NULL DEFAULT 15,
  condicoes_pagamento text,
  observacoes_orcamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_empresa_leitura" ON public.configuracoes_empresa;
CREATE POLICY "config_empresa_leitura" ON public.configuracoes_empresa
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "config_empresa_gestao" ON public.configuracoes_empresa;
CREATE POLICY "config_empresa_gestao" ON public.configuracoes_empresa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'))
  WITH CHECK (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'));

-- 3) Itens livres da proposta (não viram custo da OS)
CREATE TABLE IF NOT EXISTS public.orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_os ON public.orcamento_itens(os_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_itens TO authenticated;
GRANT ALL ON public.orcamento_itens TO service_role;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamento_itens_leitura" ON public.orcamento_itens;
CREATE POLICY "orcamento_itens_leitura" ON public.orcamento_itens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "orcamento_itens_gestao" ON public.orcamento_itens;
CREATE POLICY "orcamento_itens_gestao" ON public.orcamento_itens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'))
  WITH CHECK (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'));

-- 4) Dados do orçamento (snapshots, fotos e condições)
CREATE TABLE IF NOT EXISTS public.orcamento_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL UNIQUE REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  empresa_snapshot jsonb,
  vendedor_snapshot jsonb,
  fotos_selecionadas uuid[] NOT NULL DEFAULT '{}',
  condicoes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_dados TO authenticated;
GRANT ALL ON public.orcamento_dados TO service_role;
ALTER TABLE public.orcamento_dados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamento_dados_leitura" ON public.orcamento_dados;
CREATE POLICY "orcamento_dados_leitura" ON public.orcamento_dados
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "orcamento_dados_gestao" ON public.orcamento_dados;
CREATE POLICY "orcamento_dados_gestao" ON public.orcamento_dados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'))
  WITH CHECK (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro'));

-- 5) updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_config_empresa_updated ON public.configuracoes_empresa;
CREATE TRIGGER trg_config_empresa_updated BEFORE UPDATE ON public.configuracoes_empresa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_orcamento_itens_updated ON public.orcamento_itens;
CREATE TRIGGER trg_orcamento_itens_updated BEFORE UPDATE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_orcamento_dados_updated ON public.orcamento_dados;
CREATE TRIGGER trg_orcamento_dados_updated BEFORE UPDATE ON public.orcamento_dados
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();