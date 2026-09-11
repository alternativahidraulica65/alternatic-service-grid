import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getExecutorEmail } from "@/lib/log-executor";
import { 
  ClipboardList, 
  Wrench, 
  Settings, 
  Camera, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  LayoutDashboard,
  Box,
  Truck,
  ShieldCheck,
  History,
  MoreVertical,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Receipt,
  PackageCheck,
  Activity,
  ClipboardCheck,
  Image as ImageIcon,
  Check,
  Pencil,
  AlertTriangle,
  ChevronLeft,
  ChevronRight


} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FotoThumb, FotoChecklist } from "@/components/FotoThumb";
import { CustosOsPanel } from "@/components/CustosOsPanel";
import { GuiaExecucaoOs } from "@/components/GuiaExecucaoOs";


function descreverLog(log: any): string {
  if (log.status_anterior && log.status_novo && log.status_anterior !== log.status_novo) {
    return `Status alterado de "${log.status_anterior}" para "${log.status_novo}"`;
  }
  if (log.observacao) return String(log.observacao);
  if (log.status_novo) return `Status: ${log.status_novo}`;
  return 'Alteração registrada';
}


export const Route = createFileRoute("/_authenticated/os/$id")({
  component: GestaoOSPage,
});

function GestaoOSPage() {
  const { id } = Route.useParams();
  const osId = id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = Route.useRouteContext();
  const { podeVerValoresFinanceiros, podeGerenciarOS } = useUserRole();

  const { data: os, isLoading } = useQuery({
    queryKey: ['os_detail', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, clientes (*), tipos_equipamento (*)')
        .eq('id', osId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: osId !== null,
  });

  const { data: tiposEquipamento = [] } = useQuery({
    queryKey: ['tipos_equipamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_equipamento')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: pecas = [], isLoading: loadingPecas } = useQuery({
    queryKey: ['os_pecas', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_pecas_rastreio' as any)
        .select('*')
        .eq('os_id', osId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const pecasPendentes = (pecas as any[]).filter(
    (p: any) => !p.status_peca || p.status_peca === 'Pendente de Destinação',
  );

  const { data: fotosPorPeca = [] } = useQuery({
    queryKey: ['os_fotos_pecas', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fotos_anexos' as any)
        .select('*')
        .eq('os_id', osId)
        .like('categoria', 'peca:%')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const fotosDaPeca = (pecaId: string) =>
    (fotosPorPeca as any[]).filter((f: any) => String(f.categoria) === `peca:${pecaId}`);



  const { data: logsOs = [], isLoading: loadingLogs } = useQuery({

    queryKey: ['os_historico', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_status_os' as any)
        .select('*')
        .eq('os_id', osId)
        .order('criado_em', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("resumo");
  const [editandoTipo, setEditandoTipo] = useState(false);

  const handleTipoEquipamentoChange = async (tipoId: string) => {
    try {
      const anteriorId = os?.tipo_equipamento_id ?? null;
      if (anteriorId === tipoId) {
        setEditandoTipo(false);
        return;
      }
      const { error } = await supabase
        .from('ordens_servico')
        .update({ tipo_equipamento_id: tipoId } as any)
        .eq('id', osId);
      if (error) throw error;

      const nomeAnterior = tiposEquipamento.find((t: any) => t.id === anteriorId)?.nome ?? 'Não informado';
      const nomeNovo = tiposEquipamento.find((t: any) => t.id === tipoId)?.nome ?? tipoId;

      const { error: logError } = await supabase.from('historico_status_os' as any).insert({
        os_id: osId,
        status_anterior: os?.status ?? null,
        status_novo: os?.status ?? null,
        observacao: `Tipo de equipamento alterado de "${nomeAnterior}" para "${nomeNovo}"`,
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });
      if (logError) console.warn('Falha ao registrar histórico:', logError.message);

      queryClient.invalidateQueries({ queryKey: ['os_detail', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_checklist', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
      setEditandoTipo(false);
      toast.success("Tipo de equipamento atualizado");
    } catch (error: any) {
      toast.error("Erro ao atualizar tipo: " + error.message);
    }
  };

  const { data: terceiros = [], isLoading: loadingTerceiros } = useQuery({
    queryKey: ['os_terceiros', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_custos' as any)
        .select('*')
        .eq('os_id', osId)
        .eq('categoria', 'terceiros');
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const { data: custos = [], isLoading: loadingCustos } = useQuery({
    queryKey: ['os_custos', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_custos' as any)
        .select('*')
        .eq('os_id', osId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const steps = [
    { label: "Triagem", status: os?.status === 'aberta' ? 'current' : 'completed', sla: 'OK' },
    { label: "Vistoria", status: os?.status === 'vistoria' ? 'current' : (['aberta'].includes(os?.status || '') ? 'pending' : 'completed'), sla: '4h' },
    { label: "Orçamento", status: os?.status === 'orcamento_pendente' ? 'current' : (['aberta', 'vistoria'].includes(os?.status || '') ? 'pending' : 'completed'), sla: '24h' },
    { label: "Aprovação", status: os?.status === 'aprovada' ? 'current' : (['aberta', 'vistoria', 'orcamento_pendente'].includes(os?.status || '') ? 'pending' : 'completed'), sla: '8h' },
    { label: "Execução", status: os?.status === 'usinagem' || os?.status === 'montagem' ? 'current' : (['aberta', 'vistoria', 'orcamento_pendente', 'aprovada'].includes(os?.status || '') ? 'pending' : 'completed'), sla: '48h' },
    { label: "Pronto", status: os?.status === 'pronto' ? 'current' : 'pending', sla: '-' },
  ];

  const SLA_PRIORIDADE: Record<string, { label: string; descricao: string }> = {
    Baixa: { label: "Baixa", descricao: "Orçamento em até 3 dias úteis" },
    "Média": { label: "Média", descricao: "Orçamento em até 1 dia útil" },
    Alta: { label: "Urgente", descricao: "Orçamento no mesmo dia" },
    Urgente: { label: "Urgente", descricao: "Orçamento no mesmo dia" },
  };

  const formatarDuracao = (ms: number) => {
    const totalMin = Math.max(0, Math.floor(ms / 60000));
    const dias = Math.floor(totalMin / 1440);
    const horas = Math.floor((totalMin % 1440) / 60);
    const min = totalMin % 60;
    if (dias > 0) return `${dias}d ${horas}h`;
    if (horas > 0) return `${horas}h ${min}m`;
    return `${min}m`;
  };

  const sla = useMemo(() => {
    if (!os) return null;
    const agora = Date.now();
    const abertura = os.data_abertura ? new Date(os.data_abertura).getTime() : (os.criado_em ? new Date(os.criado_em).getTime() : null);
    const prazoOrc = (os as any).prazo_orcamento ? new Date((os as any).prazo_orcamento) : null;
    const orcamentoFeito = !['aberta', 'triagem', 'vistoria'].includes(os.status || '');
    const concluidos = steps.filter(s => s.status === 'completed').length;
    const progresso = Math.round((concluidos / steps.length) * 100);
    const restanteMs = prazoOrc ? prazoOrc.getTime() - agora : null;

    return {
      progresso,
      tempoAberto: abertura ? formatarDuracao(agora - abertura) : "N/A",
      prioridade: SLA_PRIORIDADE[os.prioridade || "Média"] ?? SLA_PRIORIDADE["Média"]!,
      prazoOrc,
      orcamentoFeito,
      emAtraso: !!(prazoOrc && !orcamentoFeito && restanteMs !== null && restanteMs < 0),
      restante: restanteMs !== null ? formatarDuracao(Math.abs(restanteMs)) : null,
      previsao: os.data_previsao_conclusao ? new Date(os.data_previsao_conclusao) : null,
    };
  }, [os, steps]);

  const { data: checklistData = [], refetch: refetchChecklist, isLoading: loadingChecklist } = useQuery({
    queryKey: ['os_checklist', osId, os?.tipo_equipamento_id],
    queryFn: async () => {
      const osTipoId = os?.tipo_equipamento_id ?? null;

      // 1. Modelos oficiais (checklist_templates) do tipo de equipamento da OS
      let itensTemplate: { componente: string; descricao: string }[] = [];
      if (osTipoId) {
        const { data: templates, error: tplError } = await supabase
          .from('checklist_templates')
          .select('id, componente_peca, descricao_avaliacao, tipo_equipamento_id, ordem_exibicao')
          .eq('tipo_equipamento_id', osTipoId)
          .order('ordem_exibicao', { ascending: true });
        if (tplError) throw tplError;
        itensTemplate = (templates ?? []).map((t: any) => ({
          componente: t.componente_peca,
          descricao: t.descricao_avaliacao ?? '',
        }));
      }

      // 2. Execução já registrada (os_checklist_tecnico) — os_id é INTEGER
      let checklistQuery = supabase
        .from('os_checklist_tecnico' as any)
        .select('*, tipos_equipamento!os_checklist_tecnico_tipo_equipamento_id_fkey(nome, categoria_principal)')
        .eq('os_id', osId);

      if (osTipoId) {
        checklistQuery = checklistQuery.eq('tipo_equipamento_id', osTipoId);
      }

      const { data: existing, error } = await checklistQuery;
      if (error) throw error;

      const registrados = (existing ?? []).map((item: any) => ({
        id: item.id,
        item: item.item_peca,
        descricao: '',
        status: item.estado_atual || 'Pendente',
        observacao: item.observacao_tecnica || '',
        foto_url: null,
        tipo_equipamento_id: item.tipo_equipamento_id,
        tipo_equipamento: item.tipos_equipamento,
      }));

      if (itensTemplate.length === 0) return registrados;

      // 3. Mesclar: template define a lista; registros preenchem o que já foi verificado
      const mapa = new Map(registrados.map((r: any) => [String(r.item).toLowerCase(), r]));
      const merged = itensTemplate.map((tpl, idx) => {
        const chave = String(tpl.componente).toLowerCase();
        const existente = mapa.get(chave);
        if (existente) {
          mapa.delete(chave);
          return { ...existente, descricao: tpl.descricao };
        }
        return {
          id: `temp-${idx}`,
          item: tpl.componente,
          descricao: tpl.descricao,
          status: 'Pendente',
          observacao: '',
          foto_url: null,
          tipo_equipamento_id: osTipoId,
        };
      });

      return [...merged, ...Array.from(mapa.values())];
    },
    enabled: !!os && osId !== null
  });


  const [savingChecklist, setSavingChecklist] = useState(false);

  const estadoLegadoDoChecklist = (status: string) =>
    status === 'Bom' ? 'aprovado' : status === 'Ruim' ? 'recuperacao' : status;

  const sincronizarPecaDoChecklist = async (nomeItem: string, status: string) => {
    try {
      const { data: existentes } = await supabase
        .from('os_pecas_rastreio' as any)
        .select('*')
        .eq('os_id', osId)
        .eq('nome', nomeItem);

      const atual: any = (existentes ?? [])[0];

      if (status === 'Ruim') {
        if (!atual) {
          const { error } = await supabase.from('os_pecas_rastreio' as any).insert({
            os_id: osId,
            nome: nomeItem,
            status_peca: 'Pendente de Destinação',
            observacao: 'Gerada automaticamente pelo checklist (item marcado como RUIM)',
            criado_por: profile?.user_id ?? null,
          });
          if (error) throw error;
          toast.info(`"${nomeItem}" enviada para destinação em Peças`);
        }
      } else if (atual && (!atual.status_peca || atual.status_peca === 'Pendente de Destinação')) {
        await supabase.from('os_pecas_rastreio' as any).delete().eq('id', atual.id);
      }
      queryClient.invalidateQueries({ queryKey: ['os_pecas', osId] });
    } catch (error: any) {
      toast.error("Erro ao sincronizar peça: " + error.message);
    }
  };

  const handleUpdatePeca = async (pecaId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('os_pecas_rastreio' as any)
        .update(updates)
        .eq('id', pecaId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['os_pecas', osId] });
      toast.success("Peça atualizada");
    } catch (error: any) {
      toast.error("Erro ao atualizar peça: " + error.message);
    }
  };

  const handleBaixaUsinagem = async (peca: any) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const { error } = await supabase
        .from('os_pecas_rastreio' as any)
        .update({ status_peca: 'concluida' })
        .eq('id', peca.id);
      if (error) throw error;

      const statusOs = String(os?.status ?? '');
      await supabase.from('historico_status_os' as any).insert({
        os_id: peca.os_id ?? osId,
        status_anterior: statusOs || null,
        status_novo: statusOs || 'em_andamento',
        observacao: `Baixa de usinagem: serviço "${peca.nome ?? peca.descricao ?? 'Peça'}" concluído na bancada.`,
        executor_id: userId,
        executor_email: await getExecutorEmail(),
      });

      queryClient.invalidateQueries({ queryKey: ['os_pecas', osId] });
      queryClient.invalidateQueries({ queryKey: ['bancadas_fila'] });
      queryClient.invalidateQueries({ queryKey: ['historico', osId] });
      toast.success('Baixa registrada e gravada no histórico da OS');
    } catch (e: any) {
      toast.error('Erro ao dar baixa: ' + e.message);
    }
  };

  // Destinações que geram custo a ser preenchido pelo gestor
  const categoriaCustoDoDestino = (destino?: string | null): string | null => {
    const d = String(destino ?? '').toLowerCase();
    if (!d) return null;
    if (d.includes('terceiro')) return 'terceiros';
    if (d.includes('comprar')) return 'material';
    if (d.includes('usinagem') || d.includes('refazer')) return 'material';
    return null;
  };

  // Garante que a peça destinada tenha um item de custo vinculado à OS (Supabase)
  const garantirCustoDaPeca = async (peca: any, opts?: { silencioso?: boolean }) => {
    const categoria = categoriaCustoDoDestino(peca?.status_peca);
    if (!categoria) return false;

    const nomePeca = peca.nome ?? peca.descricao ?? 'Peça';
    const descricao = `${peca.status_peca} - ${nomePeca}`;

    const { data: existente } = await supabase
      .from('os_custos' as any)
      .select('id')
      .eq('os_id', peca.os_id ?? osId)
      .eq('descricao', descricao)
      .limit(1);
    if ((existente ?? []).length > 0) return false;

    const { error } = await supabase.from('os_custos' as any).insert({
      os_id: peca.os_id ?? osId,
      descricao,
      categoria,
      custo_interno: 0,
      valor_venda: 0,
      is_terceirizado: categoria === 'terceiros',
      terceiro_nome: categoria === 'terceiros' ? (peca.terceiro_nome ?? null) : null,
      criado_por: profile?.user_id ?? null,
    });
    if (error) throw error;

    if (!opts?.silencioso) {
      toast.info(`"${nomePeca}" enviada para Custos — aguardando valores do gestor`);
    }
    return true;
  };

  // Sincroniza custos de peças já destinadas anteriormente
  useEffect(() => {
    if (!osId || !Array.isArray(pecas) || pecas.length === 0) return;
    let cancelado = false;
    (async () => {
      let criou = false;
      for (const peca of pecas as any[]) {
        if (!categoriaCustoDoDestino(peca?.status_peca)) continue;
        try {
          const feito = await garantirCustoDaPeca(peca, { silencioso: true });
          criou = criou || feito;
        } catch {
          // não bloqueia a tela
        }
      }
      if (criou && !cancelado) {
        queryClient.invalidateQueries({ queryKey: ['os_custos', osId] });
        queryClient.invalidateQueries({ queryKey: ['os_terceiros', osId] });
      }
    })();
    return () => { cancelado = true; };
  }, [osId, pecas]);

  const handleDefinirDestinacao = async (peca: any, destino: string) => {
    const extras = destino === 'Terceiros'
      ? { terceiro_enviado_em: peca.terceiro_enviado_em ?? new Date().toISOString(), terceiro_recebido_em: null, terceiro_recebido_por: null }
      : {};
    await handleUpdatePeca(peca.id, { status_peca: destino, ...extras });

    // Usinagem entra automaticamente na fila da bancada de usinagem (A5),
    // aguardando a liberação do gestor.
    if (destino === 'Refazer / Usinagem') {
      try {
        const { data: bancada } = await supabase
          .from('bancadas' as any)
          .select('id, codigo')
          .eq('is_usinagem', true)
          .limit(1)
          .maybeSingle();
        if (bancada) {
          await supabase
            .from('os_pecas_rastreio' as any)
            .update({ bancada_id: (bancada as any).id, aprovado_gestor: false })
            .eq('id', peca.id);
          queryClient.invalidateQueries({ queryKey: ['bancadas_fila'] });
          toast.info(`Peça enviada para a fila da bancada ${(bancada as any).codigo} — aguardando liberação do gestor`);
        }
      } catch {
        // fila de bancada é complementar; não bloqueia a destinação
      }
    }

    try {
      await garantirCustoDaPeca({ ...peca, status_peca: destino, ...extras });
      queryClient.invalidateQueries({ queryKey: ['os_custos', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_terceiros', osId] });
    } catch (error: any) {
      toast.error("Erro ao gerar custo: " + error.message);
    }
  };

  // ===== Terceiros (peças enviadas para fora) =====
  const [terceiroForm, setTerceiroForm] = useState<Record<string, { nome: string; prazo: string; obs: string }>>({});
  const [salvandoTerceiro, setSalvandoTerceiro] = useState<string | null>(null);

  const pecasTerceiros = useMemo(
    () => (pecas as any[]).filter((p) => String(p.status_peca ?? '').toLowerCase().includes('terceiro')),
    [pecas]
  );

  const formTerceiro = (peca: any) =>
    terceiroForm[peca.id] ?? {
      nome: peca.terceiro_nome ?? '',
      prazo: peca.terceiro_prazo_entrega ?? '',
      obs: peca.terceiro_observacao ?? '',
    };

  const setFormTerceiro = (pecaId: string, patch: Partial<{ nome: string; prazo: string; obs: string }>) =>
    setTerceiroForm((prev) => ({
      ...prev,
      [pecaId]: { ...(prev[pecaId] ?? { nome: '', prazo: '', obs: '' }), ...patch },
    }));

  const handleSalvarTerceiro = async (peca: any) => {
    const f = formTerceiro(peca);
    setSalvandoTerceiro(peca.id);
    try {
      const { error } = await supabase
        .from('os_pecas_rastreio' as any)
        .update({
          terceiro_nome: f.nome || null,
          terceiro_prazo_entrega: f.prazo || null,
          terceiro_observacao: f.obs || null,
          terceiro_enviado_em: peca.terceiro_enviado_em ?? new Date().toISOString(),
        })
        .eq('id', peca.id);
      if (error) throw error;

      await supabase.from('historico_status_os' as any).insert({
        os_id: peca.os_id ?? osId,
        status_anterior: os?.status ?? null,
        status_novo: os?.status ?? 'em_andamento',
        observacao: `Terceiros: "${peca.nome ?? 'Peça'}" com ${f.nome || 'terceiro não informado'}${f.prazo ? ` · prazo ${f.prazo}` : ''}`,
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });

      // mantém o custo de terceiros com o nome atualizado
      const descricao = `${peca.status_peca} - ${peca.nome ?? 'Peça'}`;
      await supabase
        .from('os_custos' as any)
        .update({ terceiro_nome: f.nome || null })
        .eq('os_id', peca.os_id ?? osId)
        .eq('descricao', descricao);

      queryClient.invalidateQueries({ queryKey: ['os_pecas', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_custos', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
      toast.success('Dados do terceiro salvos');
    } catch (e: any) {
      toast.error('Erro ao salvar terceiro: ' + e.message);
    } finally {
      setSalvandoTerceiro(null);
    }
  };

  const handleReceberTerceiro = async (peca: any) => {
    setSalvandoTerceiro(peca.id);
    try {
      const { error } = await supabase
        .from('os_pecas_rastreio' as any)
        .update({
          status_peca: 'Recebido de Terceiros',
          terceiro_recebido_em: new Date().toISOString(),
          terceiro_recebido_por: profile?.user_id ?? null,
        })
        .eq('id', peca.id);
      if (error) throw error;

      await supabase.from('historico_status_os' as any).insert({
        os_id: peca.os_id ?? osId,
        status_anterior: os?.status ?? null,
        status_novo: os?.status ?? 'em_andamento',
        observacao: `Baixa de terceiros: "${peca.nome ?? 'Peça'}" recebida de ${peca.terceiro_nome ?? 'terceiro'}`,
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });

      queryClient.invalidateQueries({ queryKey: ['os_pecas', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
      toast.success('Recebimento registrado no histórico da OS');
    } catch (e: any) {
      toast.error('Erro ao registrar recebimento: ' + e.message);
    } finally {
      setSalvandoTerceiro(null);
    }
  };

  const handleUpdateCusto = async (custoId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('os_custos' as any)
        .update(updates)
        .eq('id', custoId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['os_custos', osId] });
      toast.success("Custo atualizado");
    } catch (error: any) {
      toast.error("Erro ao atualizar custo: " + error.message);
    }
  };

  const [uploadingPecaId, setUploadingPecaId] = useState<string | null>(null);

  const handleUploadFotosPeca = async (peca: any, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPecaId(peca.id);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${osId}/pecas/${peca.id}-${Date.now()}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('os-assets')
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
        const { error: anexoError } = await supabase.from('fotos_anexos' as any).insert({
          os_id: osId,
          foto_url: urlData.publicUrl,
          storage_path: fileName,
          bucket: 'os-assets',
          legenda: peca.nome ?? peca.descricao ?? 'Peça',
          categoria: `peca:${peca.id}`,
        });
        if (anexoError) throw anexoError;
      }
      queryClient.invalidateQueries({ queryKey: ['os_fotos_pecas', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_fotos', osId] });
      toast.success("Fotos anexadas à peça");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploadingPecaId(null);
    }
  };


  const handleUpdateChecklistItem = async (itemId: string, updates: any) => {
    try {
      const item: any = checklistData.find((i: any) => i.id === itemId);
      if (itemId.startsWith('temp-')) {
        if (!item) return;

        const { error } = await supabase
          .from('os_checklist_tecnico' as any)
          .insert({
            os_id: osId,
            componente: item.item,
            item_peca: item.item,
            estado: estadoLegadoDoChecklist(updates.status || item.status),
            estado_atual: updates.status || item.status,

            observacao_tecnica: updates.observacao ?? item.observacao ?? null,
            tipo_equipamento_id: item.tipo_equipamento_id || os?.tipo_equipamento_id || null,
          });

        if (error) throw error;
      } else {
        const payload: any = {};
        if (updates.status !== undefined) {
          payload.estado_atual = updates.status;
          payload.estado = estadoLegadoDoChecklist(updates.status);
        }

        if (updates.observacao !== undefined) payload.observacao_tecnica = updates.observacao;
        const { error } = await supabase
          .from('os_checklist_tecnico' as any)
          .update(payload)
          .eq('id', itemId);
        if (error) throw error;
      }

      if (updates.status && item?.item) {
        await sincronizarPecaDoChecklist(item.item, updates.status);
      }
      refetchChecklist();
    } catch (error: any) {
      toast.error("Erro ao atualizar item: " + error.message);
    }
  };


  const handleChecklistPhoto = async (itemId: string) => {
    const item: any = checklistData.find((i: any) => i.id === itemId);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${osId}/checklist/${itemId}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('os-assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
        const { error: anexoError } = await supabase.from('fotos_anexos' as any).insert({
          os_id: osId,
          foto_url: urlData.publicUrl,
          storage_path: fileName,
          bucket: 'os-assets',
          categoria: `checklist:${item?.item ?? itemId}`,
        });
        if (anexoError) throw anexoError;
        queryClient.invalidateQueries({ queryKey: ['os_fotos_checklist', osId] });
        toast.success("Foto anexada com sucesso");
      } catch (error: any) {
        toast.error("Erro no upload: " + error.message);
      }
    };
    input.click();
  };

  const { data: fotosOs = [] } = useQuery({
    queryKey: ['os_fotos', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fotos_anexos' as any)
        .select('*')
        .eq('os_id', osId)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const { data: fotosChecklist = [] } = useQuery({
    queryKey: ['os_fotos_checklist', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fotos_anexos' as any)
        .select('*')
        .eq('os_id', osId)
        .like('categoria', 'checklist:%');
      if (error) throw error;
      return data ?? [];
    },
    enabled: osId !== null,
  });

  const fotoDoItem = (item: any) => {
    const foto = (fotosChecklist as any[]).find(
      (f: any) => String(f.categoria).toLowerCase() === `checklist:${String(item?.item ?? '').toLowerCase()}`,
    );
    return foto ? { url: foto.foto_url ?? foto.url_arquivo ?? null, path: foto.storage_path ?? null } : null;
  };

  const handleFinalizarChecklist = async () => {
    const itemsPendingPhoto = checklistData.filter((item: any) => 
      (item.status === 'Ruim' || item.status === 'Danificado' || item.status === 'Substituir') && !fotoDoItem(item)
    );

    if (itemsPendingPhoto.length > 0) {
      toast.error("Fotos obrigatórias pendentes", {
        description: "Itens com status 'Danificado' ou 'Substituir' exigem comprovação por foto."
      });
      return;
    }

    setSavingChecklist(true);
    try {
      const statusAnterior = os?.status ?? null;
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'vistoria' })
        .eq('id', osId);

      if (error) throw error;

      await supabase.from('historico_status_os' as any).insert({
        os_id: osId,
        status_anterior: statusAnterior,
        status_novo: 'vistoria',
        observacao: 'Checklist técnico finalizado e OS enviada para vistoria',
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });

      toast.success("Checklist finalizado", {
        description: "OS avançada para Vistoria Técnica."
      });
      queryClient.invalidateQueries({ queryKey: ['os_detail', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
    } catch (error: any) {
      toast.error("Erro ao finalizar: " + error.message);
    } finally {
      setSavingChecklist(false);
    }
  };

  const [laudoData, setLaudoData] = useState({
    diagnostico: "",
    defeitos: "",
    servicos_necessarios: ""
  });
  const [fotosInternas, setFotosInternas] = useState<any[]>([]);
  const [fotosPecas, setFotosPecas] = useState<any[]>([]);
  const [finalizingLaudo, setFinalizingLaudo] = useState(false);
  const [editandoLaudo, setEditandoLaudo] = useState(false);
  const [salvandoEdicaoLaudo, setSalvandoEdicaoLaudo] = useState(false);

  useEffect(() => {
    if (os) {
      // O laudo é persistido na coluna oficial "observacoes" (JSON).
      const bruto = (os as any).observacoes ?? (os as any).observacao ?? "";
      let laudo: any = {};
      try {
        laudo = bruto ? JSON.parse(bruto) : {};
      } catch {
        laudo = { diagnostico: bruto };
      }
      setLaudoData({
        diagnostico: laudo.diagnostico || "",
        defeitos: laudo.defeitos || "",
        servicos_necessarios: laudo.servicos_necessarios || ""
      });
      setEditandoLaudo(false);
    }
  }, [os]);

  const laudoSalvo = useMemo(() => {
    const bruto = (os as any)?.observacoes ?? (os as any)?.observacao ?? "";
    if (!bruto) return false;
    try {
      const j = JSON.parse(bruto);
      return Boolean(j?.diagnostico || j?.defeitos || j?.servicos_necessarios);
    } catch {
      return Boolean(String(bruto).trim());
    }
  }, [os]);

  const { data: fotosLaudo = [], refetch: refetchFotos } = useQuery({
    queryKey: ['os_fotos_laudo', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fotos_anexos' as any)
        .select('*')
        .eq('os_id', osId)
        .in('categoria', ['laudo_interno', 'laudo_pecas']);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!os && osId !== null
  });

  useEffect(() => {
    if (fotosLaudo) {
      setFotosInternas((fotosLaudo as any[]).filter((f: any) => f.categoria === 'laudo_interno'));
      setFotosPecas((fotosLaudo as any[]).filter((f: any) => f.categoria === 'laudo_pecas'));
    }
  }, [fotosLaudo]);

  const handleUploadFotoLaudo = async (tipo: 'laudo_interno' | 'laudo_pecas') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      for (const file of files) {
        try {
          const fileExt = (file as File).name.split('.').pop();
          const fileName = `${osId}/laudo/${tipo}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('os-assets')
            .upload(fileName, file as File);
          
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
          
          await supabase.from('fotos_anexos' as any).insert({
            os_id: osId,
            foto_url: urlData.publicUrl,
            storage_path: fileName,
            bucket: 'os-assets',
            categoria: tipo
          });
        } catch (error: any) {
          toast.error("Erro no upload: " + error.message);
        }
      }
      refetchFotos();
      toast.success("Fotos anexadas com sucesso");
    };
    input.click();
  };

  const handleFinalizarLaudo = async () => {
    if (!laudoData.diagnostico || !laudoData.defeitos || !laudoData.servicos_necessarios) {
      toast.error("Campos obrigatórios", {
        description: "Preencha o diagnóstico, defeitos e serviços necessários."
      });
      return;
    }

    setFinalizingLaudo(true);
    try {
      const statusAnterior = os?.status ?? null;
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          observacoes: JSON.stringify(laudoData),
          status: 'aguardando_gestor'
        } as any)
        .eq('id', osId);

      if (error) throw error;

      await supabase.from('historico_status_os' as any).insert({
        os_id: osId,
        status_anterior: statusAnterior,
        status_novo: 'aguardando_gestor',
        observacao: 'Laudo técnico finalizado',
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });

      toast.success("Laudo Técnico finalizado", {
        description: "OS alterada para 'Aguardando Gestor'."
      });
      queryClient.invalidateQueries({ queryKey: ['os_detail', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
    } catch (error: any) {
      toast.error("Erro ao finalizar laudo: " + error.message);
    } finally {
      setFinalizingLaudo(false);
    }
  };

  const handleSalvarEdicaoLaudo = async () => {
    if (!laudoData.diagnostico || !laudoData.defeitos || !laudoData.servicos_necessarios) {
      toast.error("Campos obrigatórios", {
        description: "Preencha o diagnóstico, defeitos e serviços necessários."
      });
      return;
    }
    setSalvandoEdicaoLaudo(true);
    try {
      const bruto = (os as any)?.observacoes ?? "";
      let anterior: any = {};
      try { anterior = bruto ? JSON.parse(bruto) : {}; } catch { anterior = { diagnostico: bruto }; }

      const rotulos: Record<string, string> = {
        diagnostico: "Diagnóstico",
        defeitos: "Defeitos",
        servicos_necessarios: "Serviços Necessários",
      };
      const alterados = (Object.keys(rotulos) as (keyof typeof laudoData)[])
        .filter((k) => (anterior?.[k] ?? "") !== laudoData[k])
        .map((k) => rotulos[k as string]);

      if (alterados.length === 0) {
        setEditandoLaudo(false);
        toast.info("Nenhuma alteração no laudo.");
        return;
      }

      const { error } = await supabase
        .from('ordens_servico')
        .update({ observacoes: JSON.stringify(laudoData) } as any)
        .eq('id', osId);
      if (error) throw error;

      await supabase.from('historico_status_os' as any).insert({
        os_id: osId,
        status_anterior: os?.status ?? null,
        status_novo: os?.status ?? 'em_diagnostico',
        observacao: `Laudo técnico editado (${alterados.join(', ')})`,
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });

      toast.success("Laudo atualizado", { description: "Alteração registrada no histórico." });
      setEditandoLaudo(false);
      queryClient.invalidateQueries({ queryKey: ['os_detail', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
    } catch (error: any) {
      toast.error("Erro ao salvar laudo: " + error.message);
    } finally {
      setSalvandoEdicaoLaudo(false);
    }
  };

  // ===== Entrega / Finalização da OS =====
  const [entregaForm, setEntregaForm] = useState({ data_entrega: "", entregue_por: "", testado: "" });
  const [salvandoEntrega, setSalvandoEntrega] = useState(false);
  const [editandoEntrega, setEditandoEntrega] = useState(false);

  useEffect(() => {
    if (!os) return;
    const raw = (os as any).data_entrega as string | null;
    setEntregaForm({
      data_entrega: raw ? String(raw).slice(0, 10) : "",
      entregue_por: (os as any).entregue_por ?? "",
      testado: (os as any).testado === true ? "sim" : (os as any).testado === false ? "nao" : "",
    });
  }, [os]);

  const entregaRegistrada = Boolean((os as any)?.data_entrega);

  const handleSalvarEntrega = async () => {
    if (!entregaForm.data_entrega || !entregaForm.entregue_por.trim() || !entregaForm.testado) {
      toast.error("Campos obrigatórios", { description: "Informe data de entrega, quem retirou e se foi testado." });
      return;
    }
    setSalvandoEntrega(true);
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          data_entrega: new Date(`${entregaForm.data_entrega}T12:00:00`).toISOString(),
          entregue_por: entregaForm.entregue_por.trim(),
          testado: entregaForm.testado === "sim",
          status: 'entregue',
        } as any)
        .eq('id', osId);
      if (error) throw error;

      await supabase.from('historico_status_os' as any).insert({
        os_id: osId,
        status_anterior: os?.status ?? null,
        status_novo: 'entregue',
        observacao: `OS finalizada — retirada por ${entregaForm.entregue_por.trim()} em ${new Date(`${entregaForm.data_entrega}T12:00:00`).toLocaleDateString('pt-BR')} | Testado: ${entregaForm.testado === 'sim' ? 'Sim' : 'Não'}`,
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });

      toast.success("Entrega registrada", { description: "OS finalizada e registrada no histórico." });
      setEditandoEntrega(false);
      queryClient.invalidateQueries({ queryKey: ['os_detail', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_historico', osId] });
    } catch (error: any) {
      toast.error("Erro ao registrar entrega: " + error.message);
    } finally {
      setSalvandoEntrega(false);
    }
  };



  if (isLoading) return <div className="p-10 text-center uppercase font-black text-slate-400 animate-pulse">Carregando OS...</div>;
  if (!os) return <div className="p-10 text-center uppercase font-black text-red-500">Ordem de Serviço não encontrada.</div>;

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      {/* Cabeçalho da OS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Wrench className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-2xl font-black text-foreground tracking-tight uppercase">ORDEM DE SERVIÇO <span className="text-primary">{os.numero_os ?? os.id}</span></h2>
              <Badge className="bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest">{os.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
              Cliente: <span className="text-foreground">{os.clientes?.razao_social ?? os.cliente ?? 'Cliente não informado'}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              Técnico: <span className="text-foreground">{os.tecnico?.nome || "Não atribuído"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
            <Camera className="mr-2 h-4 w-4 text-primary" />
            Anexar Foto
          </Button>
          <Button className="h-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6">
            Avançar Status
            <CheckCircle2 className="ml-2 h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 border border-border">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
              <DropdownMenuItem 
                className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                onClick={() => router.navigate({ to: '/_authenticated/os/$id/orcamento', params: { id } } as any)}
              >
                Gerar Orçamento
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                onClick={() => toast.info("Gerando resumo da OS...", { description: "O download do PDF começará em breve." })}
              >
                Exportar Resumo (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                onClick={() => setLogsDialogOpen(true)}
              >
                Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer text-red-400">Cancelar OS</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Fluxo de Processo (Stepper) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-2 group cursor-default">
            <div className={`h-1.5 w-full rounded-full transition-all ${
              step.status === 'completed' ? 'bg-emerald-500' :
              step.status === 'current' ? 'bg-primary' : 'bg-slate-200'
            }`} />
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                step.status === 'current' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              }`}>
                {step.label}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                step.status === 'current' ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-400'
              }`}>
                {step.sla}
              </span>
            </div>
          </div>
        ))}
      </div>

      {(() => {
        const TAB_LIST = [
          "Resumo", "Checklist", "Laudo Técnico", "Peças", "Terceiros",
          "Custos", "Orçamento", "Aprovação", "Execução",
          "Faturamento", "Entrega", "Garantia"
        ];
        const toValue = (t: string) => t.toLowerCase().replace(" ", "-");
        const tabValues = TAB_LIST.map(toValue);
        const activeIdx = Math.max(0, tabValues.indexOf(activeTab));
        const goTab = (dir: number) => {
          const next = (activeIdx + dir + TAB_LIST.length) % TAB_LIST.length;
          setActiveTab(tabValues[next]!);
        };
        const isTabCompleted = (tab: string) =>
          (tab === "Checklist" && os.status !== 'aberta') ||
          (tab === "Laudo Técnico" && ['orcamento_pendente', 'aprovada', 'usinagem', 'montagem', 'pronto'].includes(os.status)) ||
          (tab === "Orçamento" && ['aprovada', 'usinagem', 'montagem', 'pronto'].includes(os.status));

        return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navegação mobile: uma categoria por vez com setas */}
        <div className="flex md:hidden items-center justify-between gap-2 mb-6 border border-border rounded-lg bg-card px-2 py-2">
          <button
            type="button"
            onClick={() => goTab(-1)}
            aria-label="Categoria anterior"
            className="shrink-0 h-9 w-9 grid place-items-center rounded-md border border-border bg-muted/30 active:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="font-black uppercase text-xs tracking-widest text-primary truncate flex items-center justify-center gap-2">
              {TAB_LIST[activeIdx]}
              {isTabCompleted(TAB_LIST[activeIdx]!) && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              {activeIdx + 1} de {TAB_LIST.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goTab(1)}
            aria-label="Próxima categoria"
            className="shrink-0 h-9 w-9 grid place-items-center rounded-md border border-border bg-muted/30 active:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <TabsList className="hidden md:flex w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-8 mb-8 overflow-x-auto overflow-y-hidden custom-scrollbar">
          {TAB_LIST.map((tab) => {
            const isCompleted = isTabCompleted(tab);

            return (
              <TabsTrigger
                key={tab}
                value={toValue(tab)}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none font-bold uppercase text-[10px] tracking-widest px-0 h-12 transition-all shrink-0 flex items-center gap-2"
              >
                {tab}
                {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card className="border-border shadow-md">
                <CardHeader className="bg-muted/10 border-b border-border/50">
                  <CardTitle className="text-base font-bold uppercase tracking-widest">Informações do Equipamento</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Descrição</p>
                      <p className="font-bold text-foreground uppercase">{os.descricao || "Não informada"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Prioridade / Prazo do Orçamento</p>
                      <p className="font-bold text-foreground uppercase">{os.prioridade}</p>
                      {(os as any).prazo_orcamento && (
                        (() => {
                          const prazo = new Date((os as any).prazo_orcamento);
                          const emAtraso = prazo.getTime() < Date.now() && os.status === 'aberta';
                          return (
                            <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${emAtraso ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {emAtraso ? 'Em atraso desde ' : 'Orçar até '}
                              {prazo.toLocaleDateString('pt-BR')}
                            </p>
                          );
                        })()
                      )}
                      {(os as any).clientes?.status_cadastro === 'pendente' && (
                        <p className="mt-2 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> Cliente aguardando aprovação
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipo de Equipamento</p>
                          {podeGerenciarOS ? (
                            <Button
                              variant={editandoTipo ? "secondary" : "outline"}
                              size="sm"
                              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest"
                              onClick={() => setEditandoTipo((v) => !v)}
                            >
                              <Pencil className="h-3 w-3 mr-1.5" />
                              {editandoTipo ? "Cancelar" : "Editar"}
                            </Button>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                              Somente leitura
                            </span>
                          )}
                        </div>

                        {podeGerenciarOS && editandoTipo ? (
                          <Select
                            value={os.tipo_equipamento_id || ""}
                            onValueChange={handleTipoEquipamentoChange}
                          >
                            <SelectTrigger className="w-full md:w-96 h-10 text-xs font-bold uppercase bg-background">
                              <SelectValue placeholder="Selecione o tipo de equipamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposEquipamento.map((tipo: any) => (
                                <SelectItem key={tipo.id} value={tipo.id} className="text-xs font-bold uppercase">
                                  {tipo.nome}
                                  {tipo.categoria_principal ? ` — ${tipo.categoria_principal}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-foreground">
                              {(os as any).tipos_equipamento?.nome || "Não definido"}
                            </span>
                            {(os as any).tipos_equipamento?.categoria_principal && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {(os as any).tipos_equipamento.categoria_principal}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Observações Internas</p>
                      <p className="text-muted-foreground font-medium italic">{os.observacoes || "Nenhuma observação."}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Galeria de Imagens da OS */}
              <Card className="border-border shadow-md">
                <CardHeader className="bg-slate-50 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Imagens da OS
                    </CardTitle>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {fotosOs.length} {fotosOs.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {fotosOs.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(fotosOs as any[]).map((foto: any) => (
                        <FotoThumb
                          key={foto.id}
                          url={foto.foto_url ?? foto.url_arquivo}
                          path={foto.storage_path}
                          alt={foto.categoria || "Foto da OS"}
                          label={String(foto.categoria || 'registro').replace('checklist:', '')}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground text-center py-6 font-bold uppercase tracking-widest bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      Nenhuma imagem registrada para esta OS.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border shadow-md">
                <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest">SLA e Prazos</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Processo Geral</span>
                    <span>{sla?.progresso ?? 0}%</span>
                  </div>
                  <Progress value={sla?.progresso ?? 0} className="h-2 bg-slate-100" />
                </div>

                <div className={`p-3 rounded-lg border ${sla?.emAtraso ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sla?.emAtraso ? 'text-red-600' : 'text-amber-700'}`}>
                      Prioridade {sla?.prioridade.label}
                    </span>
                    {sla?.emAtraso && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {sla?.prioridade.descricao}
                  </p>
                  {sla?.prazoOrc && (
                    <p className={`text-xs font-black uppercase mt-2 ${sla.emAtraso ? 'text-red-600' : 'text-foreground'}`}>
                      {sla.orcamentoFeito
                        ? `Orçamento entregue • prazo era ${sla.prazoOrc.toLocaleDateString('pt-BR')}`
                        : sla.emAtraso
                          ? `Atrasado há ${sla.restante}`
                          : `Faltam ${sla.restante} (até ${sla.prazoOrc.toLocaleDateString('pt-BR')})`}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tempo em Aberto</span>
                  </div>
                  <span className="text-xs font-black text-foreground uppercase">{sla?.tempoAberto ?? "N/A"}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Previsão de Conclusão</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 uppercase">
                    {sla?.previsao ? sla.previsao.toLocaleDateString('pt-BR') : "Não definida"}
                  </span>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <Card className="border-border shadow-md overflow-hidden mt-6">
             <CardHeader className="bg-slate-900 text-white border-b border-white/5 py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest">Linha do Tempo (Logs)</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[9px] font-bold uppercase text-primary hover:text-primary"
                    onClick={() => setLogsDialogOpen(true)}
                  >
                    Ver Tudo
                  </Button>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                {loadingLogs ? (
                  <div className="px-4 py-6 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                    Carregando alterações...
                  </div>
                ) : logsOs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    Nenhuma alteração registrada.
                  </div>
                ) : (
                  logsOs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-border shrink-0">
                        <Activity className="h-3 w-3 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{"Histórico"}</p>
                        <p className="text-xs font-bold text-foreground truncate">{descreverLog(log)}</p>
                        <p className="text-[9px] font-bold text-primary truncate">{log.executor_email || 'usuário não identificado'}</p>

                      </div>
                      <span className="text-[9px] font-medium text-muted-foreground uppercase shrink-0">
                        {new Date(log.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
             </CardContent>
          </Card>

          <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-widest">Linha do Tempo Completa</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-border rounded-lg border border-border">
                {logsOs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Nenhuma alteração registrada.
                  </div>
                ) : logsOs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{"Histórico"}</p>
                      <p className="text-xs font-bold text-foreground">{descreverLog(log)}</p>
                      <p className="text-[9px] font-bold text-primary">{log.executor_email || 'usuário não identificado'}</p>

                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground uppercase shrink-0">
                      {new Date(log.criado_em).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

        </TabsContent>

        <TabsContent value="checklist">
           <Card className="border-border shadow-md">
             <CardHeader className="bg-muted/10 border-b border-border/50">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                     Ordem de Serviço #{os.numero_os ?? os.id} / Checklist
                   </div>
                   <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                     <ClipboardCheck className="h-6 w-6 text-primary" />
                     Checklist de Equipamento
                   </CardTitle>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">Equipamento: <span className="text-slate-900">{os.descricao || "N/A"}</span></p>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">Cliente: <span className="text-slate-900">{os.clientes?.razao_social ?? os.cliente ?? 'Cliente não informado'}</span></p>
                 </div>
               </div>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="mb-6 flex items-center justify-between">
                 <div>
                   <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Itens do Checklist</h3>
                   <p className="text-[10px] text-muted-foreground font-medium">Marque BOM no que está aprovado. Ao marcar RUIM, a peça vai automaticamente para destinação em "Peças" (foto obrigatória).</p>
                 </div>
                 <Badge variant="outline" className="text-[10px] font-black uppercase">{checklistData.length} itens</Badge>

               </div>

               <div className="space-y-3">
                 {loadingChecklist ? (
                   <div className="py-10 text-center animate-pulse text-[10px] font-bold uppercase text-slate-400">Carregando itens...</div>
                 ) : checklistData.length === 0 ? (
                   <div className="py-10 text-center text-[10px] font-bold uppercase text-slate-400">Nenhum item definido para este equipamento.</div>
                 ) : (
                   checklistData.map((item: any) => {
                     const bom = item.status === 'Bom' || item.status === 'Aprovado';
                     const ruim = item.status === 'Ruim' || item.status === 'Danificado' || item.status === 'Substituir';
                     return (
                       <div
                         key={item.id}
                         className={`rounded-xl border p-4 transition-all ${
                           ruim ? 'border-red-300 bg-red-50/60' : bom ? 'border-emerald-200 bg-emerald-50/40' : 'border-border bg-card'
                         }`}
                       >
                         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                           <div className="flex items-start gap-3 min-w-0">
                             <div
                               className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border ${
                                 ruim ? 'bg-red-100 border-red-200' : bom ? 'bg-emerald-100 border-emerald-200' : 'bg-slate-100 border-border'
                               }`}
                             >
                               {ruim ? (
                                 <AlertTriangle className="h-4 w-4 text-red-500" />
                               ) : bom ? (
                                 <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                               ) : (
                                 <ClipboardCheck className="h-4 w-4 text-slate-400" />
                               )}
                             </div>
                             <div className="min-w-0">
                               <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{item.item}</p>
                               {item.descricao && (
                                 <p className="text-[10px] font-medium text-muted-foreground">{item.descricao}</p>
                               )}
                               {ruim && (
                                 <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mt-1">
                                   Peça enviada para destinação
                                 </p>
                               )}
                             </div>
                           </div>

                           <div className="flex flex-wrap items-center gap-2">
                             <Button
                               size="sm"
                               variant={bom ? 'default' : 'outline'}
                               className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 ${
                                 bom ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : 'border-slate-200 bg-white text-slate-500'
                               }`}
                               onClick={() => handleUpdateChecklistItem(item.id, { status: 'Bom' })}
                             >
                               <CheckCircle2 className="h-4 w-4" />
                               Bom
                             </Button>
                             <Button
                               size="sm"
                               variant={ruim ? 'default' : 'outline'}
                               className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 ${
                                 ruim ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'border-slate-200 bg-white text-slate-500'
                               }`}
                               onClick={() => handleUpdateChecklistItem(item.id, { status: 'Ruim' })}
                             >
                               <AlertTriangle className="h-4 w-4" />
                               Ruim
                             </Button>
                              <FotoChecklist
                                url={fotoDoItem(item)?.url}
                                path={fotoDoItem(item)?.path}
                                obrigatoria={ruim && !fotoDoItem(item)}
                                onUpload={() => handleChecklistPhoto(item.id)}
                              />
                           </div>
                         </div>

                         {ruim && (
                           <Input
                             placeholder="O que está errado nesta peça?"
                             className="mt-3 h-9 text-xs border-red-200 bg-white"
                             defaultValue={item.observacao || ''}
                             onBlur={(e) => handleUpdateChecklistItem(item.id, { observacao: e.target.value })}
                           />
                         )}
                       </div>
                     );
                   })
                 )}
               </div>


               <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Ao finalizar, a OS avança para a próxima etapa.</p>
                 <div className="flex gap-3">
                   <Button variant="outline" className="h-10 border-slate-300 font-bold uppercase text-[10px] tracking-widest px-6" onClick={() => router.history.back()}>
                     Voltar
                   </Button>
                   <Button 
                    className="h-10 bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-slate-200"
                    onClick={handleFinalizarChecklist}
                    disabled={savingChecklist || checklistData.length === 0}
                   >
                     {savingChecklist ? "Finalizando..." : "Finalizar Checklist"}
                   </Button>
                 </div>
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="laudo-técnico">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    OS #{os.numero_os ?? os.id} · Cliente: {os.clientes?.razao_social ?? os.cliente ?? 'Cliente não informado'}
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                    Laudo Técnico
                  </CardTitle>
                </div>
                <div className="flex gap-2 items-center">
                  {laudoSalvo && !editandoLaudo && (
                    <Button
                      variant="outline"
                      size="icon"
                      title="Editar laudo"
                      className="h-7 w-7 border-slate-300"
                      onClick={() => setEditandoLaudo(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Badge variant="outline" className="h-7 text-[10px] font-bold uppercase border-slate-200">
                    Status: {os.status === 'aguardando_gestor' ? 'Aguardando Gestor' : 'Em Diagnóstico'}
                  </Badge>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => router.history.back()}>
                    Voltar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Coluna da Esquerda: Laudo */}
                <div className="md:col-span-2 space-y-6">
                  {laudoSalvo && !editandoLaudo ? (
                    <>
                      {([
                        ['Diagnóstico', laudoData.diagnostico],
                        ['Defeitos', laudoData.defeitos],
                        ['Serviços Necessários', laudoData.servicos_necessarios],
                      ] as [string, string][]).map(([titulo, texto]) => (
                        <div key={titulo} className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{titulo}</Label>
                          <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-sm whitespace-pre-wrap min-h-[80px] text-slate-800">
                            {texto || <span className="text-slate-400 font-bold text-[10px] uppercase">Não informado</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Diagnóstico</Label>
                        <Textarea 
                          placeholder="Descreva o diagnóstico técnico..." 
                          className="min-h-[120px] text-sm border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                          value={laudoData.diagnostico}
                          onChange={(e) => setLaudoData(prev => ({ ...prev, diagnostico: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Defeitos</Label>
                        <Textarea 
                          placeholder="Liste os defeitos encontrados..." 
                          className="min-h-[120px] text-sm border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                          value={laudoData.defeitos}
                          onChange={(e) => setLaudoData(prev => ({ ...prev, defeitos: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Serviços Necessários</Label>
                        <Textarea 
                          placeholder="Descreva os serviços que precisam ser realizados..." 
                          className="min-h-[120px] text-sm border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                          value={laudoData.servicos_necessarios}
                          onChange={(e) => setLaudoData(prev => ({ ...prev, servicos_necessarios: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </div>


                {/* Coluna da Direita: Fotos */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fotos Internas</Label>
                    <div className="rounded-xl border border-border p-4 bg-slate-50/50 space-y-4">
                      <div className="grid grid-cols-2 gap-2 min-h-[100px] content-start">
                        {fotosInternas.length === 0 ? (
                          <div className="col-span-2 flex items-center justify-center h-24 text-[10px] font-bold text-slate-400 uppercase">Nenhuma foto</div>
                        ) : (
                          fotosInternas.map((foto, idx) => (
                            <FotoThumb
                              key={idx}
                              url={foto.foto_url ?? foto.url_arquivo}
                              path={foto.storage_path}
                              alt="Interna"
                              className="group relative h-20 w-full overflow-hidden rounded-lg border border-border shadow-sm bg-slate-50"
                            />
                          ))
                        )}
                      </div>
                      <Button variant="outline" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest gap-2 bg-white" onClick={() => handleUploadFotoLaudo('laudo_interno')}>
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                        Escolher arquivos
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fotos Peças</Label>
                    <div className="rounded-xl border border-border p-4 bg-slate-50/50 space-y-4">
                      <div className="grid grid-cols-2 gap-2 min-h-[100px] content-start">
                        {fotosPecas.length === 0 ? (
                          <div className="col-span-2 flex items-center justify-center h-24 text-[10px] font-bold text-slate-400 uppercase">Nenhuma foto</div>
                        ) : (
                          fotosPecas.map((foto, idx) => (
                            <FotoThumb
                              key={idx}
                              url={foto.foto_url ?? foto.url_arquivo}
                              path={foto.storage_path}
                              alt="Peça"
                              className="group relative h-20 w-full overflow-hidden rounded-lg border border-border shadow-sm bg-slate-50"
                            />
                          ))
                        )}
                      </div>
                      <Button variant="outline" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest gap-2 bg-white" onClick={() => handleUploadFotoLaudo('laudo_pecas')}>
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                        Escolher arquivos
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                  {laudoSalvo && !editandoLaudo
                    ? "Laudo já registrado. Use o lápis para editar."
                    : laudoSalvo
                      ? "As edições serão registradas no histórico da OS."
                      : 'Ao finalizar, o status da OS será alterado para "Aguardando Gestor".'}
                </p>
                {laudoSalvo && !editandoLaudo ? (
                  <Button
                    variant="outline"
                    className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest border-slate-300 gap-2"
                    onClick={() => setEditandoLaudo(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar Laudo
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest border-slate-300"
                      onClick={() => {
                        if (laudoSalvo) setEditandoLaudo(false);
                        else router.history.back();
                      }}
                    >
                      Cancelar
                    </Button>
                    {laudoSalvo ? (
                      <Button
                        className="h-10 px-8 bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 gap-2"
                        onClick={handleSalvarEdicaoLaudo}
                        disabled={salvandoEdicaoLaudo}
                      >
                        {salvandoEdicaoLaudo ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    ) : (
                      <Button 
                        className="h-10 px-8 bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 gap-2"
                        onClick={handleFinalizarLaudo}
                        disabled={finalizingLaudo}
                      >
                        {finalizingLaudo ? "Finalizando..." : "Finalizar Diagnóstico"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peças">
           <Card className="border-border shadow-md">
             <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Box className="h-5 w-5 text-primary" />
                    Destinação de Peças
                  </CardTitle>
                  <CardDescription>Peças marcadas como RUIM no checklist entram aqui automaticamente.</CardDescription>
                </div>
                {pecasPendentes.length > 0 && (
                  <Badge className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest">
                    {pecasPendentes.length} pendente(s)
                  </Badge>
                )}
             </CardHeader>
             <CardContent className="pt-6">
                <div className="space-y-4">
                  {loadingPecas ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : pecas.length > 0 ? (
                    pecas.map((peca: any) => {
                      const pendente = !peca.status_peca || peca.status_peca === 'Pendente de Destinação';
                      return (
                        <div
                          key={peca.id}
                          className={`p-4 rounded-xl border bg-card transition-all ${pendente ? 'border-red-300 bg-red-50/40' : 'border-border'}`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${pendente ? 'bg-red-100 border-red-200' : 'bg-slate-100 border-border'}`}>
                                <Box className={`h-5 w-5 ${pendente ? 'text-red-500' : 'text-slate-400'}`} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground uppercase tracking-tight">{peca.nome ?? peca.descricao ?? 'Peça'}</p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                  <MapPin className="h-3 w-3 text-primary" />
                                  {peca.localizacao_fisica || peca.localizacao || 'Sem localização definida'}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Select
                                value={peca.status_peca && peca.status_peca !== 'Pendente de Destinação' ? peca.status_peca : ''}
                                onValueChange={(val) => handleDefinirDestinacao(peca, val)}
                              >
                                <SelectTrigger className="h-9 w-full sm:w-48 text-[10px] font-bold uppercase border-slate-200 bg-white">
                                  <SelectValue placeholder="Definir destinação" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Manutenção" className="text-[10px] font-bold uppercase">Manutenção</SelectItem>
                                  <SelectItem value="Comprar Nova" className="text-[10px] font-bold uppercase">Comprar Nova</SelectItem>
                                  <SelectItem value="Refazer / Usinagem" className="text-[10px] font-bold uppercase">Refazer / Usinagem</SelectItem>
                                  <SelectItem value="Terceiros" className="text-[10px] font-bold uppercase">Enviar a Terceiros</SelectItem>
                                  <SelectItem value="Armazenagem" className="text-[10px] font-bold uppercase">Armazenagem (reutilizar)</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Onde está a peça? (gaveta, prateleira...)"
                                className="h-9 w-full sm:w-64 text-xs border-slate-200 bg-white"
                                defaultValue={peca.localizacao_fisica || peca.localizacao || ''}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (peca.localizacao_fisica || peca.localizacao || '')) {
                                    handleUpdatePeca(peca.id, { localizacao_fisica: val, localizacao: val });
                                  }
                                }}
                              />
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-black uppercase tracking-widest justify-center ${pendente ? 'bg-red-100 text-red-600 border-red-200' : peca.status_peca === 'Armazenagem' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                              >
                                {pendente ? 'Pendente' : peca.status_peca === 'Armazenagem' ? 'Armazenada' : 'Destinada'}
                              </Badge>
                              {peca.bancada_id && peca.status_peca !== 'concluida' && (
                                <>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-black uppercase tracking-widest justify-center ${peca.aprovado_gestor ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                                  >
                                    {peca.aprovado_gestor ? 'Usinagem liberada' : 'Usinagem pendente'}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 text-[9px] font-black uppercase"
                                    disabled={!peca.aprovado_gestor}
                                    onClick={() => handleBaixaUsinagem(peca)}
                                  >
                                    Dar baixa
                                  </Button>
                                </>
                              )}
                              {peca.status_peca === 'concluida' && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-black uppercase tracking-widest justify-center bg-slate-100 text-slate-600 border-slate-200"
                                >
                                  Usinagem concluída
                                </Badge>
                              )}
                            </div>
                          </div>


                          <div className="mt-4 pt-4 border-t border-border/60">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Fotos da peça ({fotosDaPeca(peca.id).length}) — opcional
                              </p>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    handleUploadFotosPeca(peca, e.target.files);
                                    e.currentTarget.value = '';
                                  }}
                                />
                                <span className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50">
                                  <Camera className="h-3.5 w-3.5 text-primary" />
                                  {uploadingPecaId === peca.id ? 'Enviando...' : 'Adicionar fotos'}
                                </span>
                              </label>
                            </div>
                            {fotosDaPeca(peca.id).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                 {fotosDaPeca(peca.id).map((foto: any) => (
                                   <FotoThumb
                                     key={foto.id}
                                     url={foto.foto_url ?? foto.url_arquivo}
                                     path={foto.storage_path}
                                     alt={`Foto de ${peca.nome ?? 'peça'}`}
                                     className="block h-16 w-16 rounded-lg overflow-hidden border border-border bg-slate-50"
                                   />
                                 ))}
                              </div>
                            )}
                          </div>
                        </div>

                      );
                    })
                  ) : (
                    <div className="py-10 text-center opacity-40">
                      <Box className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-[10px] font-bold uppercase">Nenhuma peça pendente. Marque itens como RUIM no checklist.</p>
                    </div>
                  )}
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="terceiros">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Serviços de Terceiros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingPecas ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pecasTerceiros.length > 0 ? (
                <div className="space-y-4">
                  {pecasTerceiros.map((peca: any) => {
                    const f = formTerceiro(peca);
                    const recebido = !!peca.terceiro_recebido_em;
                    const custo = (custos as any[]).find(
                      (c) => c.descricao === `${peca.status_peca} - ${peca.nome ?? 'Peça'}`
                    );
                    return (
                      <div key={peca.id} className={`p-4 rounded-xl border space-y-4 ${recebido ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-300 bg-amber-50/30'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold uppercase text-foreground">{peca.nome ?? 'Peça'}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              OS #{os.numero_os ?? os.id} · Enviado em {peca.terceiro_enviado_em ? new Date(peca.terceiro_enviado_em).toLocaleDateString('pt-BR') : '—'}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${recebido ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                            {recebido ? `Recebido em ${new Date(peca.terceiro_recebido_em).toLocaleDateString('pt-BR')}` : 'Fora da empresa'}
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Terceiro</Label>
                            <Input
                              className="h-9 text-sm bg-white"
                              placeholder="Nome do terceiro"
                              value={f.nome}
                              onChange={(e) => setFormTerceiro(peca.id, { nome: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prazo de Entrega</Label>
                            <Input
                              type="date"
                              className="h-9 text-sm bg-white"
                              value={f.prazo ? String(f.prazo).slice(0, 10) : ''}
                              onChange={(e) => setFormTerceiro(peca.id, { prazo: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Observação</Label>
                            <Input
                              className="h-9 text-sm bg-white"
                              placeholder="Serviço combinado, valores, etc."
                              value={f.obs}
                              onChange={(e) => setFormTerceiro(peca.id, { obs: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {custo
                              ? `Custo vinculado: R$ ${Number(custo.custo_interno ?? 0).toLocaleString('pt-BR')}`
                              : 'Custo será gerado na aba Custos'}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="h-9 text-[10px] font-bold uppercase tracking-widest"
                              onClick={() => handleSalvarTerceiro(peca)}
                              disabled={salvandoTerceiro === peca.id}
                            >
                              Salvar
                            </Button>
                            {!recebido && (
                              <Button
                                className="h-9 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                onClick={() => handleReceberTerceiro(peca)}
                                disabled={salvandoTerceiro === peca.id}
                              >
                                <PackageCheck className="h-3.5 w-3.5" /> Dar baixa (recebido)
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma peça enviada a terceiros nesta OS.</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">Marque uma peça como "Enviar a Terceiros" na aba Peças.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Custos da Ordem de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <CustosOsPanel osId={osId} profile={profile} osStatus={os?.status} />
            </CardContent>

          </Card>
        </TabsContent>

        <TabsContent value="orçamento">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Orçamento Comercial
              </CardTitle>
              {podeVerValoresFinanceiros && (
                <Button 
                  className="h-9 bg-primary text-primary-foreground font-bold uppercase text-[10px] tracking-widest px-4"
                  onClick={() => router.navigate({ to: '/_authenticated/os/$id/orcamento', params: { id } } as any)}
                >
                  Abrir Módulo de Orçamento
                </Button>
              )}

            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center px-4">
                <Receipt className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest max-w-md">
                  {podeVerValoresFinanceiros 
                    ? "Utilize o módulo avançado para gerenciar custos, margens e gerar a proposta PDF."
                    : "Você não tem permissão para visualizar ou editar valores financeiros."}
                </p>
                {podeVerValoresFinanceiros && (
                  <Button 
                    variant="outline" 
                    className="mt-6 border-primary text-primary font-black uppercase text-[10px] tracking-widest px-8"
                    onClick={() => router.navigate({ to: '/_authenticated/os/$id/orcamento', params: { id } } as any)}
                  >
                    Configurar Orçamento
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovação">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Status de Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">Aprovação Técnica (Gerência)</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Revisão do laudo e custos.</p>
                  </div>
                  <Badge className="bg-slate-200 text-slate-500 font-black uppercase text-[9px] tracking-widest">Pendente</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">Aprovação Comercial (Cliente)</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Aceite formal do orçamento.</p>
                  </div>
                  <Badge className="bg-slate-200 text-slate-500 font-black uppercase text-[9px] tracking-widest">Pendente</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execução">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Guia de Execução — Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <GuiaExecucaoOs
                osId={osId}
                os={os}
                profile={profile}
                onIrParaAba={(aba) => setActiveTab(aba)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faturamento">
          {!podeVerValoresFinanceiros ? (
            <Card className="border-border shadow-md">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Acesso restrito a dados financeiros.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-md">

            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Dados de Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Faturamento ainda não processado.</p>
              </div>
            </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="entrega">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Finalização da OS
              </CardTitle>
              {entregaRegistrada && !editandoEntrega && podeGerenciarOS && (
                <Button variant="ghost" size="icon" onClick={() => setEditandoEntrega(true)} title="Editar entrega">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {entregaRegistrada && !editandoEntrega ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Data de Entrega</p>
                    <p className="text-lg font-black">{new Date((os as any).data_entrega).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Quem Retirou</p>
                    <p className="text-lg font-black">{(os as any).entregue_por || '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Testado</p>
                    <Badge variant={(os as any).testado ? 'default' : 'destructive'} className="text-xs font-bold uppercase">
                      {(os as any).testado ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-w-2xl">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">Data de Entrega</Label>
                      <Input
                        type="date"
                        value={entregaForm.data_entrega}
                        onChange={(e) => setEntregaForm({ ...entregaForm, data_entrega: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">Quem Retirou</Label>
                      <Input
                        placeholder="Nome de quem retirou"
                        value={entregaForm.entregue_por}
                        onChange={(e) => setEntregaForm({ ...entregaForm, entregue_por: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest">Testado</Label>
                      <Select value={entregaForm.testado} onValueChange={(v) => setEntregaForm({ ...entregaForm, testado: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSalvarEntrega} disabled={salvandoEntrega || !podeGerenciarOS} className="font-bold uppercase tracking-widest">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {salvandoEntrega ? 'Salvando...' : 'Finalizar OS'}
                    </Button>
                    {editandoEntrega && (
                      <Button variant="outline" onClick={() => setEditandoEntrega(false)} className="font-bold uppercase tracking-widest">
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="garantia">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Certificado de Garantia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Garantia será ativada na entrega.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
        );
      })()}
    </div>
  );
}
