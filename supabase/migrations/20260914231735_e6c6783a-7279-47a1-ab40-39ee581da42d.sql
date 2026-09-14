ALTER TABLE public.orcamento_itens
  ADD COLUMN IF NOT EXISTS tipo_item text NOT NULL DEFAULT 'proposta',
  ADD COLUMN IF NOT EXISTS custo_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_percentual numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orcamento_itens
  ADD CONSTRAINT orcamento_itens_tipo_item_check
  CHECK (tipo_item IN ('proposta', 'produto'));

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_os_tipo
  ON public.orcamento_itens(os_id, tipo_item, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_itens TO authenticated;
GRANT ALL ON public.orcamento_itens TO service_role;

NOTIFY pgrst, 'reload schema';