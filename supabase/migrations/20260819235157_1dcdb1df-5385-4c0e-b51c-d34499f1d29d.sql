ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS laudo_diagnostico TEXT,
ADD COLUMN IF NOT EXISTS laudo_defeitos TEXT,
ADD COLUMN IF NOT EXISTS laudo_servicos_necessarios TEXT;

GRANT UPDATE(laudo_diagnostico, laudo_defeitos, laudo_servicos_necessarios, status) ON public.ordens_servico TO authenticated;
