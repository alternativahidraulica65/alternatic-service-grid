CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Subserviços
CREATE TABLE IF NOT EXISTS public.os_subservicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  checklist_item_id uuid,
  origem text NOT NULL DEFAULT 'manual',
  componente text,
  descricao text NOT NULL,
  destino text NOT NULL DEFAULT 'pendente',
  operador_id uuid,
  bancada_id uuid REFERENCES public.bancadas(id) ON DELETE SET NULL,
  ordem_fila integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  motivo_pausa text,
  observacao text,
  terceiro_id uuid,
  terceiro_nome text,
  quantidade numeric NOT NULL DEFAULT 1,
  prazo_retorno date,
  enviado_em timestamptz, enviado_por uuid,
  retornado_em timestamptz, retornado_por uuid,
  fotos_envio text[] NOT NULL DEFAULT '{}',
  fotos_retorno text[] NOT NULL DEFAULT '{}',
  iniciado_em timestamptz, concluido_em timestamptz, concluido_por uuid,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT os_sub_destino_chk CHECK (destino IN ('pendente','interno','terceiro')),
  CONSTRAINT os_sub_status_chk CHECK (status IN ('aguardando','em_andamento','pausado','enviado','concluido'))
);
CREATE INDEX IF NOT EXISTS idx_os_sub_os ON public.os_subservicos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_sub_op ON public.os_subservicos(operador_id, ordem_fila);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_subservicos TO authenticated;
GRANT ALL ON public.os_subservicos TO service_role;
ALTER TABLE public.os_subservicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all_os_subservicos ON public.os_subservicos;
CREATE POLICY auth_all_os_subservicos ON public.os_subservicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_os_subservicos_updated ON public.os_subservicos;
CREATE TRIGGER trg_os_subservicos_updated BEFORE UPDATE ON public.os_subservicos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

-- Anexos
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
CREATE INDEX IF NOT EXISTS os_anexos_os_idx ON public.os_anexos(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_anexos TO authenticated;
GRANT ALL ON public.os_anexos TO service_role;
ALTER TABLE public.os_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anexos autenticados" ON public.os_anexos;
CREATE POLICY "anexos autenticados" ON public.os_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notas internas
CREATE TABLE IF NOT EXISTS public.os_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  autor_id uuid,
  autor_nome text,
  texto text NOT NULL,
  mencionados uuid[] NOT NULL DEFAULT '{}',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS os_notas_os_idx ON public.os_notas(os_id);
GRANT SELECT, INSERT, DELETE ON public.os_notas TO authenticated;
GRANT ALL ON public.os_notas TO service_role;
ALTER TABLE public.os_notas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS os_notas_ler ON public.os_notas;
CREATE POLICY os_notas_ler ON public.os_notas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS os_notas_criar ON public.os_notas;
CREATE POLICY os_notas_criar ON public.os_notas FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());
DROP POLICY IF EXISTS os_notas_remover ON public.os_notas;
CREATE POLICY os_notas_remover ON public.os_notas FOR DELETE TO authenticated USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'diretor'));

-- Notificações
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS lida boolean NOT NULL DEFAULT false;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS lida_em timestamptz;

CREATE OR REPLACE FUNCTION public.fn_notificar_mencoes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_num text; v_uid uuid;
BEGIN
  SELECT numero_os INTO v_num FROM public.ordens_servico WHERE id = NEW.os_id;
  IF NEW.mencionados IS NOT NULL THEN
    FOREACH v_uid IN ARRAY NEW.mencionados LOOP
      IF v_uid IS DISTINCT FROM NEW.autor_id THEN
        INSERT INTO public.notificacoes (usuario_id, canal_utilizado, status_envio, titulo_enviado, mensagem_enviada, os_id)
        VALUES (v_uid, 'app_interno', 'enviado', 'Você foi mencionado na OS ' || coalesce(v_num,''),
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
      INSERT INTO public.notificacoes (usuario_id, canal_utilizado, status_envio, titulo_enviado, mensagem_enviada, os_id)
      VALUES (v_dest, 'app_interno', 'enviado', v_titulo, 'O prazo desta OS venceu. Verifique o andamento.', p_os_id);
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.notificar_atraso_os(uuid) TO authenticated;

-- Vínculos de usuário
ALTER TABLE public.bancadas ADD COLUMN IF NOT EXISTS usuario_id uuid;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS usuario_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_usuario_unico ON public.colaboradores(usuario_id) WHERE usuario_id IS NOT NULL;

-- Mão de obra
ALTER TABLE public.os_custos ADD COLUMN IF NOT EXISTS mao_obra_usuario_id uuid;
ALTER TABLE public.os_custos ADD COLUMN IF NOT EXISTS mao_obra_papel text;
ALTER TABLE public.os_custos ADD COLUMN IF NOT EXISTS horas numeric;

CREATE OR REPLACE FUNCTION public.custo_hora_usuarios(p_ids uuid[])
RETURNS TABLE(usuario_id uuid, nome text, salario numeric, custo_hora numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.nome, c.salario, round(coalesce(c.salario,0) * 1.65 / 220, 2)
  FROM public.usuarios u
  LEFT JOIN public.colaboradores c ON c.usuario_id = u.id AND c.ativo
  WHERE u.id = ANY(p_ids)
    AND (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'financeiro')
      OR public.has_role(auth.uid(),'administrativo_financeiro') OR public.has_role(auth.uid(),'gestor'));
$$;
GRANT EXECUTE ON FUNCTION public.custo_hora_usuarios(uuid[]) TO authenticated;

-- Lançamentos financeiros
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS data_pagamento date;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS valor_pago numeric;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS baixado_por uuid;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS criado_por uuid;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Authenticated users can manage financeiro" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS lancamentos_financeiro_diretor ON public.lancamentos_financeiros;
CREATE POLICY lancamentos_financeiro_diretor ON public.lancamentos_financeiros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'administrativo_financeiro'))
  WITH CHECK (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'administrativo_financeiro'));

-- Resposta do cliente ao orçamento
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS orcamento_token text;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS orcamento_link_gerado_em timestamptz;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS orcamento_resposta text;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS orcamento_resposta_motivo text;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS orcamento_resposta_em timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS ordens_servico_orcamento_token_idx ON public.ordens_servico(orcamento_token) WHERE orcamento_token IS NOT NULL;

COMMENT ON TABLE public.terceiros IS 'DEPRECATED: substituída por fornecedores.tipo_parceiro';
COMMENT ON TABLE public.os_guarda_pecas IS 'DEPRECATED: substituída por os_pecas_rastreio';

NOTIFY pgrst, 'reload schema';