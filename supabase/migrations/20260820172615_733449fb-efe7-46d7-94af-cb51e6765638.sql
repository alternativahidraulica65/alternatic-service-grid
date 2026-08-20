
-- Create Tables without custom types
CREATE TABLE IF NOT EXISTS public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('informativo', 'aviso', 'erro', 'urgente')),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    condicao_disparo JSONB NOT NULL,
    destinatarios TEXT[] NOT NULL,
    canais_notificacao TEXT[] NOT NULL, -- email, push, app_interno
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ativo BOOLEAN NOT NULL DEFAULT true,
    tempo_expiracao TIMESTAMPTZ,
    criado_por UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas TO authenticated;
GRANT ALL ON public.alertas TO service_role;

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alerta_id UUID REFERENCES public.alertas(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES auth.users(id) NOT NULL,
    canal_utilizado TEXT NOT NULL CHECK (canal_utilizado IN ('email', 'push', 'app_interno')),
    data_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
    status_envio TEXT NOT NULL DEFAULT 'enviado' CHECK (status_envio IN ('enviado', 'falha', 'lido')),
    mensagem_enviada TEXT NOT NULL,
    titulo_enviado TEXT,
    metadados JSONB
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins and Managers can manage alerts" ON public.alertas;
CREATE POLICY "Admins and Managers can manage alerts"
ON public.alertas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'diretor') OR public.has_role(auth.uid(), 'gestor'));

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificacoes;
CREATE POLICY "Users can view their own notifications"
ON public.notificacoes
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Users can update status of their own notifications" ON public.notificacoes;
CREATE POLICY "Users can update status of their own notifications"
ON public.notificacoes
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- Notification Engine Helper
CREATE OR REPLACE FUNCTION public.processar_notificacoes()
RETURNS TRIGGER AS $$
DECLARE
    alerta_rec RECORD;
    dest_str TEXT;
    destinatario_id UUID;
BEGIN
    FOR alerta_rec IN 
        SELECT * FROM public.alertas 
        WHERE ativo = true 
        AND (tempo_expiracao IS NULL OR tempo_expiracao > now())
    LOOP
        IF alerta_rec.condicao_disparo->>'tabela' = TG_TABLE_NAME::text THEN
            IF NEW.status::text = alerta_rec.condicao_disparo->>'valor' AND (OLD.status IS NULL OR OLD.status::text <> alerta_rec.condicao_disparo->>'valor') THEN
                
                FOREACH dest_str IN ARRAY alerta_rec.destinatarios LOOP
                    BEGIN
                        destinatario_id := dest_str::UUID;
                        IF 'app_interno' = ANY(alerta_rec.canais_notificacao) THEN
                            INSERT INTO public.notificacoes (alerta_id, usuario_id, canal_utilizado, mensagem_enviada, titulo_enviado)
                            VALUES (alerta_rec.id, destinatario_id, 'app_interno', alerta_rec.mensagem, alerta_rec.titulo);
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Triggers
DROP TRIGGER IF EXISTS trg_notificar_os ON public.ordens_servico;
CREATE TRIGGER trg_notificar_os
AFTER UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.processar_notificacoes();
