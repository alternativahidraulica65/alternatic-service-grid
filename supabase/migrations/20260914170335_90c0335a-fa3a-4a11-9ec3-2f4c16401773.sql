ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS status_financeiro text,
  ADD COLUMN IF NOT EXISTS orcamento_enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS custo_base numeric,
  ADD COLUMN IF NOT EXISTS valor_final numeric,
  ADD COLUMN IF NOT EXISTS imposto_aplicado numeric,
  ADD COLUMN IF NOT EXISTS comissao_calculada numeric,
  ADD COLUMN IF NOT EXISTS margem_lucro_aplicada numeric;