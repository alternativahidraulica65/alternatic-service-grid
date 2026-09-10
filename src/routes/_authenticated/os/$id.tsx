import { createFileRoute, useRouter } from "@tanstack/react-router";
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
        .select('*, tipos_equipamento(nome, categoria_principal)')
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

  const handleUpdateChecklistItem = async (itemId: string, updates: any) => {
    try {
      if (itemId.startsWith('temp-')) {
        const item: any = checklistData.find((i: any) => i.id === itemId);
        if (!item) return;

        const { error } = await supabase
          .from('os_checklist_tecnico' as any)
          .insert({
            os_id: osId,
            item_peca: item.item,
            estado_atual: updates.status || item.status,
            observacao_tecnica: updates.observacao ?? item.observacao ?? null,
            tipo_equipamento_id: item.tipo_equipamento_id || os?.tipo_equipamento_id || null,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('os_checklist_tecnico' as any)
          .update({
            estado_atual: updates.status,
            observacao_tecnica: updates.observacao,
          })
          .eq('id', itemId);
        if (error) throw error;
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
          url_arquivo: urlData.publicUrl,
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

  const fotoDoItem = (item: any) =>
    (fotosChecklist as any[]).find(
      (f: any) => String(f.categoria).toLowerCase() === `checklist:${String(item?.item ?? '').toLowerCase()}`,
    )?.url_arquivo ?? null;

  const handleFinalizarChecklist = async () => {
    const itemsPendingPhoto = checklistData.filter((item: any) => 
      (item.status === 'Danificado' || item.status === 'Substituir') && !fotoDoItem(item)
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

  useEffect(() => {
    if (os) {
      // O laudo é persistido na coluna oficial "observacao" (JSON).
      let laudo: any = {};
      try {
        laudo = os.observacao ? JSON.parse(os.observacao) : {};
      } catch {
        laudo = { diagnostico: os.observacao ?? "" };
      }
      setLaudoData({
        diagnostico: laudo.diagnostico || "",
        defeitos: laudo.defeitos || "",
        servicos_necessarios: laudo.servicos_necessarios || ""
      });
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
            url_arquivo: urlData.publicUrl,
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
          observacao: JSON.stringify(laudoData),
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
          "Faturamento", "Entrega", "Garantia", "Auditoria"
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

              {/* Auditoria de Reabertura */}
              <Card className="border-border shadow-md">
                <CardHeader className="bg-slate-50 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-400" />
                      Histórico de Reabertura
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase text-primary">
                      Solicitar Revisão
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-[10px] text-muted-foreground text-center py-4 font-bold uppercase tracking-widest bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    Nenhuma reabertura registrada para esta OS.
                  </div>
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
                   <p className="text-[10px] text-muted-foreground font-medium">Fotos obrigatórias para itens com defeito.</p>
                 </div>
                 <Badge variant="outline" className="text-[10px] font-black uppercase">{checklistData.length} itens</Badge>
               </div>

               <div className="rounded-xl border border-border overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 border-b border-border">
                       <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Item</th>
                       <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-1/4">Observação</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Data/Resp.</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Foto</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                     {loadingChecklist ? (
                       <tr>
                         <td colSpan={4} className="px-4 py-10 text-center animate-pulse text-[10px] font-bold uppercase text-slate-400">Carregando itens...</td>
                       </tr>
                     ) : checklistData.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="px-4 py-10 text-center text-[10px] font-bold uppercase text-slate-400">Nenhum item definido para este equipamento.</td>
                       </tr>
                     ) : (
                       checklistData.map((item: any) => (
                         <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-4 py-4">
                             <span className="text-sm font-bold text-slate-700 uppercase">{item.item}</span>
                           </td>
                           <td className="px-4 py-4">
                             <Select 
                               value={item.status || "Pendente"} 
                               onValueChange={(val) => handleUpdateChecklistItem(item.id, { status: val })}
                             >
                               <SelectTrigger className="h-9 w-40 text-[10px] font-bold uppercase border-slate-200 bg-white">
                                 <SelectValue placeholder="Status" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="Pendente" className="text-[10px] font-bold uppercase">Pendente</SelectItem>
                                 <SelectItem value="Aprovado" className="text-[10px] font-bold uppercase">Aprovado</SelectItem>
                                 <SelectItem value="Danificado" className="text-[10px] font-bold uppercase text-red-600">Danificado</SelectItem>
                                 <SelectItem value="Substituir" className="text-[10px] font-bold uppercase text-amber-600">Substituir</SelectItem>
                                 <SelectItem value="Recuperar" className="text-[10px] font-bold uppercase text-blue-600">Recuperar</SelectItem>
                                 <SelectItem value="Não Aplicável" className="text-[10px] font-bold uppercase">Não Aplicável</SelectItem>
                               </SelectContent>
                             </Select>
                           </td>
                           <td className="px-4 py-4">
                             <Input 
                               placeholder="Descreva o estado ou observação..." 
                               className="h-9 text-xs border-slate-200 bg-white"
                               defaultValue={item.observacao || ""}
                               onBlur={(e) => handleUpdateChecklistItem(item.id, { observacao: e.target.value })}
                             />
                           </td>
                            <td className="px-4 py-4 text-center">
                              {item.data_verificacao && (
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                                    {new Date(item.data_verificacao).toLocaleDateString()}
                                  </p>
                                  <Badge variant="outline" className="text-[7px] font-black uppercase py-0 h-3 border-slate-100 text-slate-400">
                                    Técnico
                                  </Badge>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="relative group">
                                  {fotoDoItem(item) && (
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                                      <img src={fotoDoItem(item)} className="h-24 w-24 object-cover rounded-lg border-2 border-primary shadow-2xl" />
                                    </div>
                                  )}
                                  <Button 
                                    variant={fotoDoItem(item) ? "default" : "outline"} 
                                    size="sm" 
                                    className={`h-9 gap-2 px-3 border-slate-200 ${!fotoDoItem(item) && (item.status === 'Danificado' || item.status === 'Substituir') ? 'border-red-500 text-red-500 animate-pulse' : ''}`}
                                    onClick={() => handleChecklistPhoto(item.id)}
                                  >
                                    <Camera className={`h-4 w-4 ${fotoDoItem(item) ? 'text-primary-foreground' : 'text-slate-400'}`} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{fotoDoItem(item) ? "Ver" : "Foto"}</span>
                                  </Button>
                                </div>
                                {!fotoDoItem(item) && (item.status === 'Danificado' || item.status === 'Substituir') && (
                                  <span className="text-[8px] font-black uppercase text-red-500 animate-pulse">Obrigatória</span>
                                )}
                              </div>
                            </td>
                          </tr>
                       ))
                     )}
                   </tbody>
                 </table>
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
                <div className="flex gap-2">
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
                {/* Coluna da Esquerda: Textareas */}
                <div className="md:col-span-2 space-y-6">
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
                            <img key={idx} src={foto.url_arquivo} className="h-20 w-full object-cover rounded-lg border border-border shadow-sm" alt="Interna" />
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
                            <img key={idx} src={foto.url_arquivo} className="h-20 w-full object-cover rounded-lg border border-border shadow-sm" alt="Peça" />
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
                  Ao finalizar, o status da OS será alterado para "Aguardando Gestor".
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest border-slate-300">
                    Cancelar
                  </Button>
                  <Button 
                    className="h-10 px-8 bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 gap-2"
                    onClick={handleFinalizarLaudo}
                    disabled={finalizingLaudo}
                  >
                    {finalizingLaudo ? "Finalizando..." : "Finalizar Diagnóstico"}
                  </Button>
                </div>
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
                    Rastreamento de Componentes
                  </CardTitle>
                  <CardDescription>Localização e situação física de cada peça.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-9 border-primary text-primary hover:bg-primary/5 font-bold text-[10px] uppercase">Registrar Movimentação</Button>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="space-y-4">
                  {loadingPecas ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : pecas.length > 0 ? (
                    pecas.map((peca: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-border">
                            <Box className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground uppercase tracking-tight">{peca.descricao ?? peca.item_peca ?? peca.observacao ?? 'Peça'}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                              <MapPin className="h-3 w-3 text-primary" />
                              {peca.localizacao_fisica ?? 'Sem localização'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest mb-1 bg-slate-50 text-slate-600">Registrada</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center opacity-20">
                      <Box className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-[10px] font-bold uppercase">Nenhuma peça registrada</p>
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
              {loadingTerceiros ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : terceiros.length > 0 ? (
                <div className="space-y-4">
                  {terceiros.map((t: any, i: number) => (
                    <div key={t.id || i} className="flex items-center justify-between p-4 rounded-xl border border-border">
                       <p className="text-sm font-bold uppercase">{t.descricao}</p>
                       <p className="text-sm font-black text-primary">R$ {Number(t.valor).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhum serviço de terceiro registrado.</p>
                  <Button variant="outline" className="mt-4 border-primary text-primary font-bold text-[10px] uppercase">Contratar Terceiro</Button>
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
              <div className="grid gap-6 md:grid-cols-3 mb-6">
                <div className="p-4 rounded-xl border border-border bg-slate-50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Mão de Obra</p>
                  <p className="text-lg font-black text-foreground">
                    R$ {custos.filter((c: any) => c.categoria === 'mao_de_obra').reduce((acc: number, curr: any) => acc + Number(curr.valor_total_custo ?? 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-slate-50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Materiais/Peças</p>
                  <p className="text-lg font-black text-foreground">
                    R$ {custos.filter((c: any) => c.categoria === 'material').reduce((acc: number, curr: any) => acc + Number(curr.valor_total_custo ?? 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Custo Total</p>
                  <p className="text-lg font-black text-primary">
                    R$ {custos.reduce((acc: number, curr: any) => acc + Number(curr.valor_total_custo ?? 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full border-dashed border-2 font-bold uppercase text-[10px] tracking-widest">
                {loadingCustos ? "Carregando..." : "Lançar Novo Custo"}
              </Button>
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
                Execução de Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Aguardando início da execução.</p>
              </div>
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
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Logística de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Truck className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Aguardando prontidão do equipamento.</p>
              </div>
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

        <TabsContent value="auditoria">
           <Card className="border-border shadow-md overflow-hidden">
             <CardHeader className="bg-slate-900 text-white border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold uppercase tracking-widest">Log de Auditoria da OS</CardTitle>
                  </div>
                </div>
             </CardHeader>
             <CardContent className="pt-6 px-0">
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Histórico de alterações sendo processado.</p>
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
