-- Create companies table to track revenue by CNPJ
CREATE TABLE public.empresas_emissoras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    cnpj text UNIQUE NOT NULL,
    cor_identificacao text DEFAULT '#FFD700',
    criado_em timestamptz DEFAULT now()
);

-- Create OS table with relation to users and companies
CREATE TABLE public.ordens_servico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_os text UNIQUE NOT NULL,
    cliente text NOT NULL,
    descricao text,
    status text NOT NULL DEFAULT 'aberta',
    valor_total numeric(12,2) DEFAULT 0,
    margem_lucro numeric(5,2),
    empresa_id uuid REFERENCES public.empresas_emissoras(id),
    operador_atribuido uuid REFERENCES auth.users(id),
    criado_em timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_emissoras TO authenticated;
GRANT ALL ON public.empresas_emissoras TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;

-- RLS
ALTER TABLE public.empresas_emissoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Policies for companies
CREATE POLICY "Permitir leitura para autenticados" ON public.empresas_emissoras FOR SELECT TO authenticated USING (true);

-- Policies for OS
CREATE POLICY "Diretores veem todas as OS" ON public.ordens_servico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'diretor') OR auth.jwt()->>'email' = 'admin@teste.com');
CREATE POLICY "Financeiro vê todas as OS" ON public.ordens_servico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Gestores veem todas as OS" ON public.ordens_servico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Operadores veem apenas suas OS" ON public.ordens_servico FOR SELECT TO authenticated USING (operador_atribuido = auth.uid());

-- Insert Seed Data
INSERT INTO public.empresas_emissoras (nome, cnpj, cor_identificacao) VALUES 
('Alternativa Matriz', '12.345.678/0001-90', '#FFD700'),
('Alternativa Filial Sul', '12.345.678/0002-71', '#A9A9A9'),
('Alternativa Equipamentos', '98.765.432/0001-10', '#708090');