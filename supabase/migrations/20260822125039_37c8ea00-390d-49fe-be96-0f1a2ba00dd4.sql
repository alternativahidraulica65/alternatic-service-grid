
CREATE TABLE IF NOT EXISTS public.tipos_equipamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_equipamentos TO authenticated;
GRANT ALL ON public.tipos_equipamentos TO service_role;
GRANT SELECT ON public.tipos_equipamentos TO anon;

INSERT INTO public.tipos_equipamentos (nome, descricao) 
VALUES 
    ('Cilindro Hidráulico', 'Cilindros de diversas polegadas'),
    ('Bomba Hidráulica', 'Bombas de engrenagem, pistão ou palheta'),
    ('Válvula Direcional', 'Comandos e válvulas de controle'),
    ('Motor Hidráulico', 'Motores de torque e rotação')
ON CONFLICT (nome) DO NOTHING;
