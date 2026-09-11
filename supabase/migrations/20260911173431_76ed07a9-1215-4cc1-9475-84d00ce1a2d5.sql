ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS status_cadastro text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS solicitado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_reprovacao text;

ALTER TABLE public.os_custos
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_pagamento date;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_custos TO authenticated;
GRANT ALL ON public.os_custos TO service_role;