CREATE TABLE public.materiais_precos_referencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  especificacao text NOT NULL,
  acabamento text,
  formato text NOT NULL DEFAULT 'redondo',
  diametro_mm numeric,
  diametro_int_mm numeric,
  faixa_min_mm numeric,
  faixa_max_mm numeric,
  densidade numeric NOT NULL DEFAULT 7.85,
  preco_kg numeric NOT NULL,
  ipi_percentual numeric NOT NULL DEFAULT 3.25,
  data_referencia date NOT NULL DEFAULT current_date,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_precos_referencia TO authenticated;
GRANT ALL ON public.materiais_precos_referencia TO service_role;
ALTER TABLE public.materiais_precos_referencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpr_select_auth" ON public.materiais_precos_referencia FOR SELECT TO authenticated USING (true);
CREATE POLICY "mpr_write_dirfin" ON public.materiais_precos_referencia FOR ALL TO authenticated USING (public.is_dir_fin(auth.uid())) WITH CHECK (public.is_dir_fin(auth.uid()));
CREATE TRIGGER trg_mpr_updated BEFORE UPDATE ON public.materiais_precos_referencia FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
COMMENT ON TABLE public.materias_primas IS 'DEPRECATED: replaced by materiais_precos_referencia';