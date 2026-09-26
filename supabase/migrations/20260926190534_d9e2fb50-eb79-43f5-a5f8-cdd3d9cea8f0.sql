CREATE TABLE IF NOT EXISTS public.terceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.terceiros TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.terceiros TO authenticated;
GRANT ALL ON public.terceiros TO service_role;
ALTER TABLE public.terceiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Terceiros: leitura para logados" ON public.terceiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Terceiros: gestao por gestao" ON public.terceiros FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.cargo IN ('gestor','diretor','administrativo_financeiro','dev')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.cargo IN ('gestor','diretor','administrativo_financeiro','dev')));
CREATE OR REPLACE FUNCTION public.set_updated_at_generic() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS trg_terceiros_updated_at ON public.terceiros;
CREATE TRIGGER trg_terceiros_updated_at BEFORE UPDATE ON public.terceiros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
NOTIFY pgrst, 'reload schema';