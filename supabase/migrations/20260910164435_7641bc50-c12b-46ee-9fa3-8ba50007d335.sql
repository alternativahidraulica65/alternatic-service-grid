ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS componente_peca text,
  ADD COLUMN IF NOT EXISTS descricao_avaliacao text,
  ADD COLUMN IF NOT EXISTS ordem_exibicao integer;

ALTER TABLE public.checklist_templates ALTER COLUMN itens DROP NOT NULL;
ALTER TABLE public.checklist_templates ALTER COLUMN nome DROP NOT NULL;