ALTER TABLE public.logs_sistema ADD COLUMN IF NOT EXISTS os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL;
ALTER TABLE public.logs_sistema ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.logs_sistema ALTER COLUMN entidade SET DEFAULT 'OS';

CREATE OR REPLACE FUNCTION public.log_evento(p_os_id uuid, p_acao text, p_descricao text, p_dados_antigos jsonb DEFAULT NULL::jsonb, p_dados_novos jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_usuario_profile_id uuid;
  v_usuario_nome text;
  v_os_numero text;
  v_log_id uuid;
BEGIN
  SELECT id, nome INTO v_usuario_profile_id, v_usuario_nome
  FROM public.usuarios WHERE user_id = auth.uid() LIMIT 1;

  SELECT numero_os INTO v_os_numero FROM public.ordens_servico WHERE id = p_os_id;

  INSERT INTO public.logs_sistema (
    os_id, usuario_id, usuario_nome, acao, entidade, registro_id, os_numero,
    descricao, dados_anteriores, dados_novos, criado_em
  ) VALUES (
    p_os_id, v_usuario_profile_id, v_usuario_nome, p_acao, 'OS', p_os_id, v_os_numero,
    p_descricao, p_dados_antigos, p_dados_novos, now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_os_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_usuario_profile_id uuid;
  v_usuario_nome text;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT id, nome INTO v_usuario_profile_id, v_usuario_nome
    FROM public.usuarios WHERE user_id = auth.uid() LIMIT 1;

    INSERT INTO public.logs_sistema (
      os_id, usuario_id, usuario_nome, acao, entidade, registro_id, os_numero,
      descricao, dados_anteriores, dados_novos
    ) VALUES (
      NEW.id, v_usuario_profile_id, v_usuario_nome, 'STATUS_UPDATE', 'OS', NEW.id, NEW.numero_os,
      format('Status alterado de %s para %s', OLD.status, NEW.status),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;