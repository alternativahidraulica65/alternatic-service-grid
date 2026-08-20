-- Enum para regra de comissão
CREATE TYPE public.tipo_regra_comissao AS ENUM ('percentual_bruto', 'lucro_liquido');

-- Enum para tipo de cálculo
CREATE TYPE public.tipo_calculo_comissao AS ENUM ('percentual', 'divisao_custos');

-- Tabela de Vendedores
CREATE TABLE public.vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    regra_comissao public.tipo_regra_comissao NOT NULL DEFAULT 'percentual_bruto',
    tipo_calculo public.tipo_calculo_comissao NOT NULL DEFAULT 'percentual',
    percentual NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    observacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de junção Vendedor x Empresas
CREATE TABLE public.vendedor_empresas (
    vendedor_id UUID REFERENCES public.vendedores(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas_emissoras(id) ON DELETE CASCADE,
    PRIMARY KEY (vendedor_id, empresa_id)
);

-- Habilitar RLS
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedor_empresas ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores TO authenticated;
GRANT ALL ON public.vendedores TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedor_empresas TO authenticated;
GRANT ALL ON public.vendedor_empresas TO service_role;

-- Políticas
CREATE POLICY "Acesso total para usuários autenticados em vendedores"
ON public.vendedores FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total para usuários autenticados em vendedor_empresas"
ON public.vendedor_empresas FOR ALL TO authenticated USING (true);

-- Inserir alguns dados de exemplo
INSERT INTO public.vendedores (nome, regra_comissao, tipo_calculo, percentual, observacao)
VALUES 
('Ana Beatriz Costa', 'percentual_bruto', 'percentual', 5.0, ''),
('Carlos Eduardo Silva', 'lucro_liquido', 'divisao_custos', 12.5, 'Comissionado especial'),
('Fernanda Oliveira', 'percentual_bruto', 'percentual', 7.0, '');
