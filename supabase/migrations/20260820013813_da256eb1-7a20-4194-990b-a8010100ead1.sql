-- 1. Metadados de fotos
ALTER TABLE public.os_fotos_anexos
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS bucket text DEFAULT 'os-midias',
  ADD COLUMN IF NOT EXISTS categoria text;

-- Alias de nomenclatura exigido pela diretriz
CREATE OR REPLACE VIEW public.fotos_anexos
WITH (security_invoker = true) AS
  SELECT id, os_id, peca_id, foto_url, storage_path, bucket, categoria, legenda, tipo, criado_em, criado_por
  FROM public.os_fotos_anexos;

GRANT SELECT ON public.fotos_anexos TO authenticated;
GRANT ALL ON public.fotos_anexos TO service_role;

-- 2. Revisões de orçamento
CREATE TABLE IF NOT EXISTS public.orcamento_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  numero_revisao integer NOT NULL DEFAULT 0,
  numero_orcamento text,
  pdf_storage_path text NOT NULL,
  fotos_selecionadas uuid[] NOT NULL DEFAULT '{}',
  valor_total numeric NOT NULL DEFAULT 0,
  parametros jsonb,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orcamento_id, numero_revisao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_revisoes TO authenticated;
GRANT ALL ON public.orcamento_revisoes TO service_role;

ALTER TABLE public.orcamento_revisoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financeiro/Gestor/Diretor leem revisoes" ON public.orcamento_revisoes;
CREATE POLICY "Financeiro/Gestor/Diretor leem revisoes"
ON public.orcamento_revisoes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
  OR public.has_role(auth.uid(), 'financeiro')
);

DROP POLICY IF EXISTS "Financeiro/Gestor/Diretor criam revisoes" ON public.orcamento_revisoes;
CREATE POLICY "Financeiro/Gestor/Diretor criam revisoes"
ON public.orcamento_revisoes FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
  OR public.has_role(auth.uid(), 'financeiro')
);

-- 3. Políticas de storage
DROP POLICY IF EXISTS "os_midias_select" ON storage.objects;
CREATE POLICY "os_midias_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'os-midias');

DROP POLICY IF EXISTS "os_midias_insert" ON storage.objects;
CREATE POLICY "os_midias_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'os-midias' AND (
    public.has_role(auth.uid(), 'diretor')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'operador')
    OR public.has_role(auth.uid(), 'tecnico')
  )
);

DROP POLICY IF EXISTS "os_midias_update" ON storage.objects;
CREATE POLICY "os_midias_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'os-midias' AND (
    public.has_role(auth.uid(), 'diretor')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'operador')
    OR public.has_role(auth.uid(), 'tecnico')
  )
);

DROP POLICY IF EXISTS "orcamentos_docs_select" ON storage.objects;
CREATE POLICY "orcamentos_docs_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'orcamentos-docs' AND (
    public.has_role(auth.uid(), 'diretor')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'administrativo_financeiro')
    OR public.has_role(auth.uid(), 'financeiro')
  )
);

DROP POLICY IF EXISTS "orcamentos_docs_insert" ON storage.objects;
CREATE POLICY "orcamentos_docs_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'orcamentos-docs' AND (
    public.has_role(auth.uid(), 'diretor')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'administrativo_financeiro')
    OR public.has_role(auth.uid(), 'financeiro')
  )
);
