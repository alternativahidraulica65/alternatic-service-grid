-- Tabela de Logs de Auditoria Centralizada
CREATE TABLE IF NOT EXISTS public.logs_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id),
    usuario_nome TEXT,
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    registro_id UUID,
    os_numero TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões
GRANT SELECT, INSERT ON public.logs_sistema TO authenticated;
GRANT ALL ON public.logs_sistema TO service_role;

-- RLS
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- Política de RLS usando os enums corretos: 'diretor' e 'gestor'
CREATE POLICY "Admins e Gestores podem ver todos os logs"
ON public.logs_sistema
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'diretor') OR public.has_role(auth.uid(), 'gestor'));

-- Trigger para capturar mudanças na tabela ordens_servico
CREATE OR REPLACE FUNCTION public.fn_log_os_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_nome TEXT;
BEGIN
    SELECT nome INTO v_usuario_nome FROM public.usuarios WHERE id = auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.logs_sistema (usuario_id, usuario_nome, acao, entidade, registro_id, os_numero, dados_novos)
        VALUES (auth.uid(), v_usuario_nome, 'Criação', 'OS', NEW.id, NEW.numero_os, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.logs_sistema (usuario_id, usuario_nome, acao, entidade, registro_id, os_numero, dados_anteriores, dados_novos)
        VALUES (auth.uid(), v_usuario_nome, 'Alteração', 'OS', NEW.id, NEW.numero_os, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.logs_sistema (usuario_id, usuario_nome, acao, entidade, registro_id, os_numero, dados_anteriores)
        VALUES (auth.uid(), v_usuario_nome, 'Exclusão', 'OS', OLD.id, OLD.numero_os, row_to_json(OLD)::jsonb);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_os_changes ON public.ordens_servico;
CREATE TRIGGER trg_log_os_changes
AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.fn_log_os_changes();

-- Inserir alguns logs iniciais baseados nos dados existentes
INSERT INTO public.logs_sistema (usuario_nome, acao, entidade, os_numero, dados_novos, criado_em)
SELECT 'Sistema', 'Sincronização', 'OS', numero_os, row_to_json(os)::jsonb, criado_em
FROM public.ordens_servico os
LIMIT 20;
