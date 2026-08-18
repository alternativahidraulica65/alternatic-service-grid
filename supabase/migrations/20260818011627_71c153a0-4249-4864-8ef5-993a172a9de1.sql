
-- Tabela de Produtos
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_venda DECIMAL(12,2) NOT NULL DEFAULT 0,
    estoque INTEGER NOT NULL DEFAULT 0,
    categoria TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total para autenticados em produtos" ON public.produtos FOR ALL TO authenticated USING (true);

-- Tabela de Pedidos
CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido SERIAL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'cancelado'
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total para autenticados em pedidos" ON public.pedidos FOR ALL TO authenticated USING (true);

-- Tabela de Itens de Pedido
CREATE TABLE public.itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT ALL ON public.itens_pedido TO service_role;

ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total para autenticados em itens_pedido" ON public.itens_pedido FOR ALL TO authenticated USING (true);
