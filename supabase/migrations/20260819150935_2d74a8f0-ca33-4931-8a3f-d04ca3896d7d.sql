
-- 1. Tabela de Auditoria
CREATE TABLE IF NOT EXISTS public.auditoria_financeira (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    tabela TEXT NOT NULL,
    registro_id UUID NOT NULL,
    valores_antigos JSONB,
    valores_novos JSONB,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria_financeira TO authenticated;
GRANT ALL ON public.auditoria_financeira TO service_role;

ALTER TABLE public.auditoria_financeira ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Diretores e Financeiro podem ver auditoria') THEN
        CREATE POLICY "Diretores e Financeiro podem ver auditoria"
        ON public.auditoria_financeira
        FOR SELECT
        TO authenticated
        USING (
          public.has_role(auth.uid(), 'diretor') OR 
          public.has_role(auth.uid(), 'financeiro') OR
          public.has_role(auth.uid(), 'administrativo_financeiro')
        );
    END IF;
END $$;

-- 2. Função de Trigger para Auditoria
CREATE OR REPLACE FUNCTION public.registrar_auditoria_fornecedor()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.auditoria_financeira (user_id, acao, tabela, registro_id, valores_antigos, valores_novos)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.auditoria_financeira (user_id, acao, tabela, registro_id, valores_antigos)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.auditoria_financeira (user_id, acao, tabela, registro_id, valores_novos)
        VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para fornecedores
DROP TRIGGER IF EXISTS audit_fornecedores ON public.fornecedores;
CREATE TRIGGER audit_fornecedores
AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_fornecedor();

-- Trigger para lancamentos_financeiros
DROP TRIGGER IF EXISTS audit_lancamentos ON public.lancamentos_financeiros;
CREATE TRIGGER audit_lancamentos
AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_fornecedor();
