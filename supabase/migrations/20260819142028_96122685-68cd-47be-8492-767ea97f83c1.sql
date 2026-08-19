-- Update fornecedores table with new fields
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS contato TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS limite_mensal DECIMAL(12,2) DEFAULT 0;

-- Grant permissions (ensuring authenticated users can manage suppliers)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

-- Update RLS policies for fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.fornecedores;
CREATE POLICY "Enable read access for authenticated users" ON public.fornecedores
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.fornecedores;
CREATE POLICY "Enable insert for authenticated users" ON public.fornecedores
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.fornecedores;
CREATE POLICY "Enable update for authenticated users" ON public.fornecedores
    FOR UPDATE TO authenticated USING (true);

-- Seed some suppliers if the table is empty to help visualization
INSERT INTO public.fornecedores (nome, cnpj, contato, ativo, limite_mensal)
SELECT 'Peças Industriais LTDA', '12.345.678/0001-90', '(11) 99999-8888', true, 5000.00
WHERE NOT EXISTS (SELECT 1 FROM public.fornecedores WHERE nome = 'Peças Industriais LTDA');

INSERT INTO public.fornecedores (nome, cnpj, contato, ativo, limite_mensal)
SELECT 'Lubrificantes & Cia', '98.765.432/0001-10', '(11) 77777-6666', true, 2000.00
WHERE NOT EXISTS (SELECT 1 FROM public.fornecedores WHERE nome = 'Lubrificantes & Cia');
