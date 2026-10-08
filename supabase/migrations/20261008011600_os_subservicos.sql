CREATE TABLE IF NOT EXISTS public.os_subservicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  checklist_item_id uuid,
  origem text NOT NULL DEFAULT 'manual',
  componente text,
  descricao text NOT NULL,
  destino text NOT NULL DEFAULT 'pendente',
  operador_id uuid,
  bancada_id uuid REFERENCES public.bancadas(id) ON DELETE SET NULL,
  ordem_fila integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  motivo_pausa text,
  observacao text,
  terceiro_id uuid,
  terceiro_nome text,
  quantidade numeric NOT NULL DEFAULT 1,
  prazo_retorno date,
  enviado_em timestamptz, enviado_por uuid,
  retornado_em timestamptz, retornado_por uuid,
  fotos_envio text[] NOT NULL DEFAULT '{}',
  fotos_retorno text[] NOT NULL DEFAULT '{}',
  iniciado_em timestamptz, concluido_em timestamptz, concluido_por uuid,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT os_sub_destino_chk CHECK (destino IN ('pendente','interno','terceiro')),
  CONSTRAINT os_sub_status_chk CHECK (status IN ('aguardando','em_andamento','pausado','enviado','concluido'))
);
CREATE INDEX IF NOT EXISTS idx_os_sub_os ON public.os_subservicos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_sub_op ON public.os_subservicos(operador_id, ordem_fila);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_subservicos TO authenticated;
GRANT ALL ON public.os_subservicos TO service_role;
ALTER TABLE public.os_subservicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all_os_subservicos ON public.os_subservicos;
CREATE POLICY auth_all_os_subservicos ON public.os_subservicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_os_subservicos_updated ON public.os_subservicos;
CREATE TRIGGER trg_os_subservicos_updated BEFORE UPDATE ON public.os_subservicos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
NOTIFY pgrst, 'reload schema';
