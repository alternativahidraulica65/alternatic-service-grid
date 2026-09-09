ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS status_cadastro text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS solicitado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_reprovacao text;

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS prazo_orcamento timestamptz;

CREATE OR REPLACE FUNCTION public.add_dias_uteis(p_base timestamptz, p_dias int)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_data date := (p_base AT TIME ZONE 'America/Sao_Paulo')::date;
  v_restantes int := p_dias;
BEGIN
  WHILE v_restantes > 0 LOOP
    v_data := v_data + 1;
    IF extract(isodow FROM v_data) < 6 THEN
      v_restantes := v_restantes - 1;
    END IF;
  END LOOP;
  RETURN ((v_data + time '18:00') AT TIME ZONE 'America/Sao_Paulo');
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_prazo_orcamento(p_base timestamptz, p_prioridade text)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_prioridade, 'média'))
    WHEN 'baixa' THEN public.add_dias_uteis(coalesce(p_base, now()), 3)
    WHEN 'urgente' THEN public.add_dias_uteis(coalesce(p_base, now()), 0)
    WHEN 'alta' THEN public.add_dias_uteis(coalesce(p_base, now()), 0)
    ELSE public.add_dias_uteis(coalesce(p_base, now()), 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_prazo_orcamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.prazo_orcamento := public.calc_prazo_orcamento(coalesce(NEW.data_abertura, NEW.criado_em, now()), NEW.prioridade);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_prazo_orcamento ON public.ordens_servico;
CREATE TRIGGER trg_set_prazo_orcamento
BEFORE INSERT OR UPDATE OF prioridade, data_abertura ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.fn_set_prazo_orcamento();

UPDATE public.ordens_servico SET prioridade = 'Urgente' WHERE lower(coalesce(prioridade,'')) = 'alta';
UPDATE public.ordens_servico
SET prazo_orcamento = public.calc_prazo_orcamento(coalesce(data_abertura, criado_em, now()), prioridade)
WHERE prazo_orcamento IS NULL;

DROP POLICY IF EXISTS "Autenticados podem criar clientes" ON public.clientes;
CREATE POLICY "Autenticados podem criar clientes"
ON public.clientes FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Diretoria e financeiro aprovam clientes" ON public.clientes;
CREATE POLICY "Diretoria e financeiro aprovam clientes"
ON public.clientes FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'diretor')
  OR public.has_role(auth.uid(), 'administrativo_financeiro')
  OR public.has_role(auth.uid(), 'financeiro')
  OR public.has_role(auth.uid(), 'gestor')
)
WITH CHECK (true);