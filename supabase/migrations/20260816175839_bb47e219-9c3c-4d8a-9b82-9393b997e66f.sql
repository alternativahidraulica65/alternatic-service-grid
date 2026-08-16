-- Table for OS Technical Checklist
CREATE TABLE IF NOT EXISTS public.os_checklist_tecnico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    componente TEXT NOT NULL, -- 'embolo', 'haste', 'parafusos', 'olhal', 'roscas'
    estado TEXT CHECK (estado IN ('aprovado', 'recuperacao', 'substituir')),
    observacao_tecnica TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);

-- Table for Storage/Location of pieces
CREATE TABLE IF NOT EXISTS public.os_guarda_pecas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT NOT NULL,
    localizacao TEXT NOT NULL, -- e.g. 'Caixa 05'
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);

-- Table for Photos/Attachments
CREATE TABLE IF NOT EXISTS public.os_fotos_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    peca_id UUID REFERENCES public.os_guarda_pecas(id) ON DELETE SET NULL,
    foto_url TEXT NOT NULL,
    legenda TEXT,
    tipo TEXT DEFAULT 'vistoria', -- 'vistoria', 'final'
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_checklist_tecnico TO authenticated;
GRANT ALL ON public.os_checklist_tecnico TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_guarda_pecas TO authenticated;
GRANT ALL ON public.os_guarda_pecas TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_fotos_anexos TO authenticated;
GRANT ALL ON public.os_fotos_anexos TO service_role;

-- RLS
ALTER TABLE public.os_checklist_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_guarda_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_fotos_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see checklists for accessible OSs"
ON public.os_checklist_tecnico FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators can insert/update checklists"
ON public.os_checklist_tecnico FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can see storage for accessible OSs"
ON public.os_guarda_pecas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators can manage storage"
ON public.os_guarda_pecas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can see photos for accessible OSs"
ON public.os_fotos_anexos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators can manage photos"
ON public.os_fotos_anexos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);