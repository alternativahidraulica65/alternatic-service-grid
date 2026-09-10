CREATE TABLE public.bancadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tecnico_nome text,
  is_usinagem boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bancadas TO authenticated;
GRANT ALL ON public.bancadas TO service_role;

ALTER TABLE public.bancadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver bancadas"
ON public.bancadas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados podem gerenciar bancadas"
ON public.bancadas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_bancadas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bancadas_updated_at
BEFORE UPDATE ON public.bancadas
FOR EACH ROW EXECUTE FUNCTION public.set_bancadas_updated_at();

INSERT INTO public.bancadas (codigo, nome, is_usinagem) VALUES
  ('A1', 'Bancada A1', false),
  ('A2', 'Bancada A2', false),
  ('A3', 'Bancada A3', false),
  ('A4', 'Bancada A4', false),
  ('A5', 'Bancada A5 - Usinagem', true),
  ('A6', 'Bancada A6', false);

ALTER TABLE public.os_pecas_rastreio
  ADD COLUMN IF NOT EXISTS bancada_id uuid REFERENCES public.bancadas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovado_gestor boolean NOT NULL DEFAULT false;