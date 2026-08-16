
-- 1. Tabela de Materiais para Cálculo de Peso/Custo
CREATE TABLE public.materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    densidade DECIMAL NOT NULL, -- kg/dm³
    preco_base_kg DECIMAL NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais TO authenticated;
GRANT ALL ON public.materiais TO service_role;

-- 2. Configurações de Comissão e Regras de Negócio
CREATE TYPE public.tipo_comissao AS ENUM ('padrao', 'divisao_50_50');

CREATE TABLE public.configuracoes_vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    regra_comissao tipo_comissao DEFAULT 'padrao',
    porcentagem_padrao DECIMAL DEFAULT 5,
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_vendedores TO authenticated;
GRANT ALL ON public.configuracoes_vendedores TO service_role;

-- 3. Atualização na Tabela de Custos OS para suportar a Tela 7
ALTER TABLE public.custos_os ADD COLUMN margem_lucro_percentual DECIMAL DEFAULT 30;
ALTER TABLE public.custos_os ADD COLUMN preco_venda_final DECIMAL;
ALTER TABLE public.custos_os ADD COLUMN comissao_vendedor DECIMAL;
ALTER TABLE public.custos_os ADD COLUMN aprovado_diretoria BOOLEAN DEFAULT FALSE;

-- 4. Inserção de dados iniciais para Materiais (Tela 11)
INSERT INTO public.materiais (nome, densidade, preco_base_kg) VALUES
('Aço 1045', 7.85, 12.50),
('Aço 1020', 7.87, 9.80),
('Nylon 6.0', 1.14, 45.00),
('Bronze TM 23', 8.80, 120.00),
('Cromo Duro (Haste)', 7.85, 25.00);

ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diretores podem gerenciar tudo" ON public.materiais
    TO authenticated USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Todos autenticados podem ver materiais" ON public.materiais
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas admin gere comissões" ON public.configuracoes_vendedores
    TO authenticated USING (public.has_role(auth.uid(), 'diretor'));
