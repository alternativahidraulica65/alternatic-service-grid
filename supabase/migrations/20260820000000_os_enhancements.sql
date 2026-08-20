-- Add audit table for OS category changes
CREATE TABLE IF NOT EXISTS public.os_auditoria_categorias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    categoria text NOT NULL,
    acao text NOT NULL, -- 'concluida', 'reaberta'
    executor_id uuid REFERENCES public.usuarios(id),
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.os_auditoria_categorias TO authenticated;
GRANT ALL ON public.os_auditoria_categorias TO service_role;
ALTER TABLE public.os_auditoria_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para autenticados" ON public.os_auditoria_categorias FOR ALL TO authenticated USING (true);

-- Add SLA and concluding fields to ordens_servico
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS categorias_concluidas text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sla_config jsonb DEFAULT '{}';

-- Create table for notifications
CREATE TABLE IF NOT EXISTS public.os_notificacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    tipo text NOT NULL, -- 'email', 'push', 'sistema'
    lida boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.os_notificacoes TO authenticated;
GRANT ALL ON public.os_notificacoes TO service_role;
ALTER TABLE public.os_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para autenticados" ON public.os_notificacoes FOR ALL TO authenticated USING (true);
