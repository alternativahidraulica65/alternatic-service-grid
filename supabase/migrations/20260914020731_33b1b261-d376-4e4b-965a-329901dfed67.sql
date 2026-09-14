ALTER TABLE public.vendedores
  ADD COLUMN IF NOT EXISTS apelido text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS tipo_comissao text,
  ADD COLUMN IF NOT EXISTS valor_comissao numeric;

UPDATE public.vendedores
SET tipo_comissao = CASE
  WHEN tipo_comissao IS NOT NULL THEN tipo_comissao
  WHEN regra_comissao::text = 'lucro_liquido' THEN 'margem_bruta'
  ELSE 'percentual_os'
END;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS vendedor_id uuid,
  ADD COLUMN IF NOT EXISTS venda_propria boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_vendedor_id_fkey'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_vendedor_id_fkey
      FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON public.clientes(vendedor_id);