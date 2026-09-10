DROP VIEW public.fotos_anexos;
ALTER TABLE public.os_fotos_anexos RENAME TO fotos_anexos;

ALTER TABLE public.historico_processo_os RENAME TO historico_status_os;
ALTER TABLE public.pecas_os RENAME TO os_pecas_rastreio;
ALTER TABLE public.custos_os RENAME TO os_custos;
ALTER TABLE public.cliente_contatos RENAME TO contatos_cliente;
ALTER TABLE public.materiais RENAME TO materias_primas;

ALTER TABLE public.os_checklist_tecnico
  ADD COLUMN IF NOT EXISTS item_peca text,
  ADD COLUMN IF NOT EXISTS estado_atual text,
  ADD COLUMN IF NOT EXISTS tipo_equipamento_id uuid REFERENCES public.tipos_equipamento(id);

ALTER TABLE public.os_pecas_rastreio
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS localizacao_fisica text,
  ADD COLUMN IF NOT EXISTS status_peca text;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS ultimo_numero_orcamento integer DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotos_anexos TO authenticated;
GRANT ALL ON public.fotos_anexos TO service_role;
ALTER TABLE public.fotos_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gerenciam fotos" ON public.fotos_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);