ALTER TABLE public.os_pecas_rastreio
  ADD COLUMN IF NOT EXISTS terceiro_nome text,
  ADD COLUMN IF NOT EXISTS terceiro_prazo_entrega date,
  ADD COLUMN IF NOT EXISTS terceiro_enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS terceiro_recebido_em timestamptz,
  ADD COLUMN IF NOT EXISTS terceiro_recebido_por uuid,
  ADD COLUMN IF NOT EXISTS terceiro_observacao text;

CREATE INDEX IF NOT EXISTS idx_os_pecas_rastreio_terceiro
  ON public.os_pecas_rastreio (terceiro_recebido_em)
  WHERE terceiro_enviado_em IS NOT NULL;