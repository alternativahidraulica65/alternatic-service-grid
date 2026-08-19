
-- Add cliente_id to lancamentos_financeiros if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos_financeiros' AND column_name = 'cliente_id') THEN
        ALTER TABLE public.lancamentos_financeiros ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Create orçamentos table if it doesn't exist (assuming it's needed for the "Aba Orçamentos")
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    numero_orcamento TEXT NOT NULL UNIQUE,
    data_emissao TIMESTAMPTZ DEFAULT now(),
    validade TIMESTAMPTZ,
    valor_total DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado, expirado
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure RLS is enabled and grants are set for orçamentos
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT ALL ON public.orcamentos TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orcamentos' AND policyname = 'Authenticated users can manage orcamentos') THEN
        CREATE POLICY "Authenticated users can manage orcamentos" ON public.orcamentos FOR ALL TO authenticated USING (true);
    END IF;
END
$$;

-- Add RLS for lancamentos_financeiros if not already present
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_financeiros TO authenticated;
GRANT ALL ON public.lancamentos_financeiros TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lancamentos_financeiros' AND policyname = 'Authenticated users can manage financeiro') THEN
        CREATE POLICY "Authenticated users can manage financeiro" ON public.lancamentos_financeiros FOR ALL TO authenticated USING (true);
    END IF;
END
$$;
