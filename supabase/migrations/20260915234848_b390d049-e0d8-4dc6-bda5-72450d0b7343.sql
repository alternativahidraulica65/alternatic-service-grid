CREATE TABLE IF NOT EXISTS public.filtros_salvos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lista text NOT NULL,
  nome text NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lista, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.filtros_salvos TO authenticated;
GRANT ALL ON public.filtros_salvos TO service_role;

ALTER TABLE public.filtros_salvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "filtros_salvos_proprios" ON public.filtros_salvos
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_filtros_salvos_updated
  BEFORE UPDATE ON public.filtros_salvos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE INDEX IF NOT EXISTS idx_filtros_salvos_user_lista ON public.filtros_salvos(user_id, lista);

NOTIFY pgrst, 'reload schema';