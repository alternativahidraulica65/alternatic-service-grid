ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS data_entrega timestamp with time zone,
  ADD COLUMN IF NOT EXISTS testado boolean;