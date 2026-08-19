CREATE TABLE public.fornecedores (
    id uuid primary key default gen_random_uuid(),
    nome text not null unique,
    cnpj text,
    contato text,
    criado_em timestamp with time zone default now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

-- Enable RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.fornecedores FOR ALL TO authenticated USING (true);

-- Create finance_records table for direct financial entries
CREATE TABLE public.lancamentos_financeiros (
    id uuid primary key default gen_random_uuid(),
    fornecedor_id uuid references public.fornecedores(id) on delete cascade,
    valor numeric(12,2) not null,
    data_competencia date not null default current_date,
    descricao text,
    os_id uuid references public.ordens_servico(id), -- Optional link to OS
    tipo text check (tipo in ('entrada', 'saida')) default 'saida',
    criado_em timestamp with time zone default now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_financeiros TO authenticated;
GRANT ALL ON public.lancamentos_financeiros TO service_role;

-- Enable RLS
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.lancamentos_financeiros FOR ALL TO authenticated USING (true);

-- Seed some suppliers
INSERT INTO public.fornecedores (nome) VALUES ('Hidráulica Central'), ('Óleos & Cia'), ('Metalúrgica Sul');
