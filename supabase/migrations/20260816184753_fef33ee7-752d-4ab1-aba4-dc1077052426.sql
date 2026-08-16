
-- Create clientes table
CREATE TABLE public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    email text,
    cnpj text,
    telefone text,
    endereco text,
    criado_em timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Grant access to clientes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

-- Enable RLS on clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers can manage clientes" 
ON public.clientes 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'diretor') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Others can only view clientes" 
ON public.clientes 
FOR SELECT 
TO authenticated 
USING (true);

-- Add 'tecnico' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnico';

-- Update usuarios to have a cargo field or use perfil? 
-- The user said "filtrar por cargo = 'tecnico'". I'll add 'cargo' to usuarios.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS cargo text;

-- Alter ordens_servico to match new requirements
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id),
ADD COLUMN IF NOT EXISTS tecnico_id uuid REFERENCES public.usuarios(id),
ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'Média',
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS data_abertura timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS data_previsao_conclusao timestamp with time zone;

-- Grant column permissions just in case (though table is already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;

-- Seed some data for testing
INSERT INTO public.clientes (nome, cnpj) VALUES ('HidroMetal SA', '12.345.678/0001-90');
INSERT INTO public.clientes (nome, cnpj) VALUES ('AgroFortes LTDA', '98.765.432/0001-21');
