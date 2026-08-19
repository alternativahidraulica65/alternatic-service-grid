
-- Create contacts table
CREATE TABLE IF NOT EXISTS public.cliente_contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    cargo TEXT,
    email TEXT,
    telefone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS public.cliente_equipamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT,
    modelo TEXT,
    numero_serie TEXT,
    fabricante TEXT,
    ultima_manutencao TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure RLS is enabled and grants are set
ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_equipamentos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_contatos TO authenticated;
GRANT ALL ON public.cliente_contatos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_equipamentos TO authenticated;
GRANT ALL ON public.cliente_equipamentos TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_contatos' AND policyname = 'Authenticated users can manage contacts') THEN
        CREATE POLICY "Authenticated users can manage contacts" ON public.cliente_contatos FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_equipamentos' AND policyname = 'Authenticated users can manage equipment') THEN
        CREATE POLICY "Authenticated users can manage equipment" ON public.cliente_equipamentos FOR ALL TO authenticated USING (true);
    END IF;
END
$$;
