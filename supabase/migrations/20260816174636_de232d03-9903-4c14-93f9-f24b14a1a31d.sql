
-- Criação das tabelas para rastreabilidade de peças e processos
CREATE TABLE public.pecas_os (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    localizacao TEXT, -- Ex: Gaveta 04, Caixa Técnica #12
    foto_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);

CREATE TABLE public.historico_processo_os (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    status_anterior TEXT,
    status_novo TEXT NOT NULL,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    executor_id UUID REFERENCES auth.users(id)
);

-- Permissões (Grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas_os TO authenticated;
GRANT ALL ON public.pecas_os TO service_role;

GRANT SELECT, INSERT ON public.historico_processo_os TO authenticated;
GRANT ALL ON public.historico_processo_os TO service_role;

-- RLS
ALTER TABLE public.pecas_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_processo_os ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para usuários autenticados em pecas_os"
ON public.pecas_os FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total para usuários autenticados em historico_processo_os"
ON public.historico_processo_os FOR ALL TO authenticated USING (true);
