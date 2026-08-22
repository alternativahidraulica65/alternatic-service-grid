
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_equipamento_id UUID REFERENCES public.tipos_equipamentos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    criado_por UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para usuários autenticados" 
ON public.checklist_templates FOR ALL 
TO authenticated 
USING (true);

-- Adicionar colunas necessárias na os_checklist_tecnico se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_checklist_tecnico' AND column_name='data_verificacao') THEN
        ALTER TABLE public.os_checklist_tecnico ADD COLUMN data_verificacao TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_checklist_tecnico' AND column_name='responsavel_id') THEN
        ALTER TABLE public.os_checklist_tecnico ADD COLUMN responsavel_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_checklist_tecnico' AND column_name='foto_url') THEN
        ALTER TABLE public.os_checklist_tecnico ADD COLUMN foto_url TEXT;
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_checklist_tecnico TO authenticated;
GRANT ALL ON public.os_checklist_tecnico TO service_role;
