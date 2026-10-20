ALTER TABLE public.os_pecas_rastreio ADD COLUMN IF NOT EXISTS subservico_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS os_pecas_rastreio_subservico_uidx ON public.os_pecas_rastreio(subservico_id) WHERE subservico_id IS NOT NULL;

UPDATE public.os_pecas_rastreio p SET subservico_id = s.id
FROM public.os_subservicos s
WHERE p.subservico_id IS NULL AND p.os_id = s.os_id
  AND lower(trim(p.nome)) = lower(trim(coalesce(s.componente, s.descricao)))
  AND NOT EXISTS (SELECT 1 FROM public.os_pecas_rastreio x WHERE x.subservico_id = s.id);

CREATE OR REPLACE FUNCTION public.fn_sync_sub_para_peca() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.destino = 'terceiro' AND NOT EXISTS (SELECT 1 FROM public.os_pecas_rastreio WHERE subservico_id = NEW.id) THEN
    INSERT INTO public.os_pecas_rastreio (os_id, nome, status_peca, subservico_id, terceiro_nome, terceiro_prazo_entrega, terceiro_enviado_em, criado_por)
    VALUES (NEW.os_id, coalesce(NEW.componente, left(NEW.descricao, 80)), 'Terceiros', NEW.id, NEW.terceiro_nome, NEW.prazo_retorno, coalesce(NEW.enviado_em, now()), NEW.criado_por);
  ELSE
    UPDATE public.os_pecas_rastreio SET
      terceiro_nome = coalesce(NEW.terceiro_nome, terceiro_nome),
      terceiro_prazo_entrega = coalesce(NEW.prazo_retorno, terceiro_prazo_entrega),
      terceiro_enviado_em = coalesce(NEW.enviado_em, terceiro_enviado_em),
      terceiro_recebido_em = coalesce(NEW.retornado_em, terceiro_recebido_em),
      terceiro_recebido_por = coalesce(NEW.retornado_por, terceiro_recebido_por),
      status_peca = CASE
        WHEN NEW.status = 'concluido' THEN 'concluida'
        WHEN NEW.retornado_em IS NOT NULL THEN 'Recebido de Terceiros'
        ELSE status_peca END
    WHERE subservico_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_sub_para_peca ON public.os_subservicos;
CREATE TRIGGER trg_sync_sub_para_peca AFTER INSERT OR UPDATE ON public.os_subservicos
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_sub_para_peca();

CREATE OR REPLACE FUNCTION public.fn_sync_peca_para_sub() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR NEW.subservico_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.terceiro_recebido_em IS NOT NULL AND OLD.terceiro_recebido_em IS NULL THEN
    UPDATE public.os_subservicos SET
      retornado_em = coalesce(retornado_em, NEW.terceiro_recebido_em),
      retornado_por = coalesce(retornado_por, NEW.terceiro_recebido_por),
      status = 'concluido',
      concluido_em = coalesce(concluido_em, now()),
      concluido_por = coalesce(concluido_por, auth.uid())
    WHERE id = NEW.subservico_id AND status <> 'concluido';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_peca_para_sub ON public.os_pecas_rastreio;
CREATE TRIGGER trg_sync_peca_para_sub AFTER UPDATE ON public.os_pecas_rastreio
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_peca_para_sub();