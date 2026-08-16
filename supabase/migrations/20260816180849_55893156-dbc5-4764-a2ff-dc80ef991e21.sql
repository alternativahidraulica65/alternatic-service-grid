-- Tabela de Custos de OS
CREATE TABLE public.custos_os (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    custo_interno NUMERIC(15,2) DEFAULT 0,
    valor_venda NUMERIC(15,2) DEFAULT 0,
    terceiro_nome TEXT,
    is_terceirizado BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos_os TO authenticated;
GRANT ALL ON public.custos_os TO service_role;

ALTER TABLE public.custos_os ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados"
ON public.custos_os
FOR ALL
TO authenticated
USING (true);