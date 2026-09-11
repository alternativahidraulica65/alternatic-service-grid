CREATE TABLE public.os_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  responsavel_id uuid,
  prazo date,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  concluida_por uuid,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_tarefas TO authenticated;
GRANT ALL ON public.os_tarefas TO service_role;

ALTER TABLE public.os_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam tarefas da OS"
ON public.os_tarefas FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX idx_os_tarefas_os_id ON public.os_tarefas(os_id);

CREATE OR REPLACE FUNCTION public.set_os_tarefas_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_os_tarefas_updated_at
BEFORE UPDATE ON public.os_tarefas
FOR EACH ROW EXECUTE FUNCTION public.set_os_tarefas_updated_at();