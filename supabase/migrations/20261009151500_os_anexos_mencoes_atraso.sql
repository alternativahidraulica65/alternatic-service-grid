CREATE TABLE IF NOT EXISTS public.os_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'outros',
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  tamanho_bytes bigint,
  tipo_mime text,
  enviado_por uuid,
  enviado_por_nome text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_anexos TO authenticated;
GRANT ALL ON public.os_anexos TO service_role;
ALTER TABLE public.os_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anexos autenticados" ON public.os_anexos;
CREATE POLICY "anexos autenticados" ON public.os_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS os_anexos_os_idx ON public.os_anexos(os_id);

CREATE OR REPLACE FUNCTION public.fn_notificar_mencoes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_num text; v_uid uuid;
BEGIN
  SELECT numero_os INTO v_num FROM public.ordens_servico WHERE id = NEW.os_id;
  IF NEW.mencionados IS NOT NULL THEN
    FOREACH v_uid IN ARRAY NEW.mencionados::uuid[] LOOP
      IF v_uid IS DISTINCT FROM NEW.autor_id THEN
        INSERT INTO public.notificacoes (usuario_id, canal_utilizado, titulo_enviado, mensagem_enviada, os_id)
        VALUES (v_uid, 'app_interno', 'Você foi mencionado na OS ' || coalesce(v_num,''),
          coalesce(NEW.autor_nome,'Colega') || ': ' || left(NEW.texto, 140), NEW.os_id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notificar_mencoes ON public.os_notas;
CREATE TRIGGER trg_notificar_mencoes AFTER INSERT ON public.os_notas FOR EACH ROW EXECUTE FUNCTION public.fn_notificar_mencoes();

CREATE OR REPLACE FUNCTION public.notificar_atraso_os(p_os_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_os record; v_dest uuid; v_titulo text;
BEGIN
  SELECT id, numero_os, operador_atribuido INTO v_os FROM public.ordens_servico WHERE id = p_os_id;
  IF v_os.id IS NULL THEN RETURN; END IF;
  v_titulo := 'OS ' || coalesce(v_os.numero_os,'') || ' em atraso';
  FOR v_dest IN
    SELECT DISTINCT u FROM (
      SELECT v_os.operador_atribuido AS u
      UNION SELECT user_id FROM public.user_roles WHERE role IN ('gestor','diretor')
    ) x WHERE u IS NOT NULL
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.notificacoes WHERE usuario_id = v_dest AND os_id = p_os_id
        AND titulo_enviado = v_titulo AND data_envio::date = now()::date) THEN
      INSERT INTO public.notificacoes (usuario_id, canal_utilizado, titulo_enviado, mensagem_enviada, os_id)
      VALUES (v_dest, 'app_interno', v_titulo, 'O prazo desta OS venceu. Verifique o andamento.', p_os_id);
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.notificar_atraso_os(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
