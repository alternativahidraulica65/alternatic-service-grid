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
  Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export const Route = createFileRoute("/_authenticated/os/$id")({
  component: GestaoOSPage,
});

function GestaoOSPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: os, isLoading } = useQuery({
    queryKey: ['os_detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes (*),
          tecnico:usuarios!ordens_servico_tecnico_id_fkey (*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: pecas = [] } = useQuery({
    queryKey: ['os_pecas', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('os_guarda_pecas').select('*').eq('os_id', id);
      if (error) throw error;
      return data;
    }
  });

  const steps = [
    { label: "Triagem", status: os?.status === 'aberta' ? 'current' : 'completed' },
    { label: "Vistoria", status: os?.status === 'vistoria' ? 'current' : (['aberta'].includes(os?.status || '') ? 'pending' : 'completed') },
    { label: "Orçamento", status: os?.status === 'orcamento_pendente' ? 'current' : (['aberta', 'vistoria'].includes(os?.status || '') ? 'pending' : 'completed') },
    { label: "Aprovação", status: os?.status === 'aprovada' ? 'current' : (['aberta', 'vistoria', 'orcamento_pendente'].includes(os?.status || '') ? 'pending' : 'completed') },
    { label: "Execução", status: os?.status === 'usinagem' || os?.status === 'montagem' ? 'current' : (['aberta', 'vistoria', 'orcamento_pendente', 'aprovada'].includes(os?.status || '') ? 'pending' : 'completed') },
    { label: "Pronto", status: os?.status === 'pronto' ? 'current' : 'pending' },
  ];

  const { data: checklistData = [], refetch: refetchChecklist, isLoading: loadingChecklist } = useQuery({
    queryKey: ['os_checklist', id],
    queryFn: async () => {
      // 1. Tentar buscar checklist já vinculado à OS
      const { data: existing, error } = await supabase
        .from('os_checklist' as any)
        .select('*')
        .eq('os_id', id);
      
      if (error) {
        console.warn("Checklist fetch error:", error);
      }

      if (existing && existing.length > 0) {
        return existing;
      }

      // 2. Se não existir, buscar o tipo de equipamento da OS para carregar do template
      if (os?.descricao) {
        // Tentamos extrair o tipo da descrição ou usamos um fallback
        // Em um cenário real, haveria um campo 'tipo_equipamento' na tabela 'ordens_servico'
        const { data: templates } = await (supabase as any)
          .from('checklist_templates')
          .select('*');
        
        // Tenta encontrar um template que bata com a descrição
        const template = templates?.find((t: any) => 
          os.descricao?.toLowerCase().includes(t.tipo_equipamento.toLowerCase())
        );

        if (template && template.itens) {
          // Criar itens iniciais (não salvos ainda, apenas para exibição/preenchimento)
          return (template.itens as any[]).map((item: any, idx: number) => ({
            id: `temp-${idx}`,
            item: item.label,
            status: 'Pendente',
            observacao: '',
            foto_url: null
          }));
        }
      }

      return [];
    },
    enabled: !!os
  });

  const [savingChecklist, setSavingChecklist] = useState(false);

  const handleUpdateChecklistItem = async (itemId: string, updates: any) => {
    try {
      // Se for um item temporário, precisamos primeiro garantir que ele exista no banco
      if (itemId.startsWith('temp-')) {
        const item: any = checklistData.find((i: any) => i.id === itemId);
        if (!item) return;
        
        const { error } = await supabase
          .from('os_checklist' as any)
          .insert({
            os_id: id,
            item: item.item,
            status: updates.status || item.status,
            observacao: updates.observacao || item.observacao,
            foto_url: updates.foto_url || item.foto_url
          });
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('os_checklist' as any)
          .update(updates)
          .eq('id', itemId);
        if (error) throw error;
      }
      refetchChecklist();
    } catch (error: any) {
      toast.error("Erro ao atualizar item: " + error.message);
    }
  };

  const handleChecklistPhoto = async (itemId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/checklist/${itemId}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('os-assets')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
        await handleUpdateChecklistItem(itemId, { foto_url: urlData.publicUrl });
        toast.success("Foto anexada com sucesso");
      } catch (error: any) {
        toast.error("Erro no upload: " + error.message);
      }
    };
    input.click();
  };

  const handleFinalizarChecklist = async () => {
    const itemsPendingPhoto = checklistData.filter((item: any) => 
      (item.status === 'Danificado' || item.status === 'Substituir') && !item.foto_url
    );

    if (itemsPendingPhoto.length > 0) {
      toast.error("Fotos obrigatórias pendentes", {
        description: "Itens com status 'Danificado' ou 'Substituir' exigem comprovação por foto."
      });
      return;
    }

    setSavingChecklist(true);
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'vistoria' })
        .eq('id', id);
      if (error) throw error;
      
      toast.success("Checklist finalizado", {
        description: "OS avançada para Vistoria Técnica."
      });
      queryClient.invalidateQueries({ queryKey: ['os_detail', id] });
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
      setLaudoData({
        diagnostico: os.laudo_diagnostico || "",
        defeitos: os.laudo_defeitos || "",
        servicos_necessarios: os.laudo_servicos_necessarios || ""
      });
    }
  }, [os]);

  const { data: fotosLaudo = [], refetch: refetchFotos } = useQuery({
    queryKey: ['os_fotos_laudo', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_fotos_anexos')
        .select('*')
        .eq('os_id', id)
        .in('tipo', ['laudo_interno', 'laudo_pecas']);
      if (error) throw error;
      return data;
    },
    enabled: !!os
  });

  useEffect(() => {
    if (fotosLaudo) {
      setFotosInternas(fotosLaudo.filter((f: any) => f.tipo === 'laudo_interno'));
      setFotosPecas(fotosLaudo.filter((f: any) => f.tipo === 'laudo_pecas'));
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
          const fileName = `${id}/laudo/${tipo}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('os-assets')
            .upload(fileName, file as File);
          
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
          
          await supabase.from('os_fotos_anexos').insert({
            os_id: id,
            foto_url: urlData.publicUrl,
            tipo: tipo
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
      const { error } = await supabase
        .from('ordens_servico')
        .update({ 
          laudo_diagnostico: laudoData.diagnostico,
          laudo_defeitos: laudoData.defeitos,
          laudo_servicos_necessarios: laudoData.servicos_necessarios,
          status: 'aguardando_gestor' // Altera status conforme solicitado
        })
        .eq('id', id);
      
      if (error) throw error;

      toast.success("Laudo Técnico finalizado", {
        description: "OS alterada para 'Aguardando Gestor'."
      });
      queryClient.invalidateQueries({ queryKey: ['os_detail', id] });
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
              <h2 className="font-display text-2xl font-black text-foreground tracking-tight uppercase">ORDEM DE SERVIÇO <span className="text-primary">{os.numero_os}</span></h2>
              <Badge className="bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest">{os.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
              Cliente: <span className="text-foreground">{os.cliente}</span>
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
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
              step.status === 'current' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-8 mb-8 overflow-x-auto overflow-y-hidden custom-scrollbar">
          {[
            "Resumo", 
            "Checklist", 
            "Laudo Técnico", 
            "Peças", 
            "Terceiros",
            "Custos",
            "Orçamento", 
            "Aprovação", 
            "Execução",
            "Faturamento",
            "Entrega",
            "Garantia",
            "Auditoria"
          ].map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab.toLowerCase().replace(" ", "-")} 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none font-bold uppercase text-[10px] tracking-widest px-0 h-12 transition-all shrink-0"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-border shadow-md">
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
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Prioridade</p>
                    <p className="font-bold text-foreground uppercase">{os.prioridade}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Observações Internas</p>
                    <p className="text-muted-foreground font-medium italic">{os.observacoes || "Nenhuma observação."}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest">SLA e Prazos</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Processo Geral</span>
                    <span>15%</span>
                  </div>
                  <Progress value={15} className="h-2 bg-slate-100" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tempo em Aberto</span>
                  </div>
                  <span className="text-xs font-black text-foreground uppercase">4h 20m</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Previsão</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 uppercase">{os.data_previsao_conclusao ? new Date(os.data_previsao_conclusao).toLocaleDateString() : "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-md overflow-hidden">
             <CardHeader className="bg-slate-900 text-white border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold uppercase tracking-widest">Linha do Tempo (Logs)</CardTitle>
                  </div>
                  <Button variant="ghost" className="text-[10px] font-bold uppercase text-primary">Ver Tudo</Button>
                </div>
             </CardHeader>
             <CardContent className="pt-6 px-0">
                {[
                  { user: "João Silva", action: "Iniciou a Vistoria Técnica", time: "Há 10 min", icon: Wrench },
                  { user: "Sistema", action: `OS ${os.numero_os} Alterada para status '${os.status}'`, time: "Agora", icon: Settings },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-border shrink-0">
                      <log.icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{log.user}</p>
                      <p className="text-sm font-bold text-foreground">{log.action}</p>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">{log.time}</span>
                  </div>
                ))}
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
           <Card className="border-border shadow-md">
             <CardHeader className="bg-muted/10 border-b border-border/50">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                     Ordem de Serviço #{os.numero_os} / Checklist
                   </div>
                   <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                     <ClipboardCheck className="h-6 w-6 text-primary" />
                     Checklist de Equipamento
                   </CardTitle>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">Equipamento: <span className="text-slate-900">{os.descricao || "N/A"}</span></p>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">Cliente: <span className="text-slate-900">{os.cliente}</span></p>
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
                       <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-1/3">Observação</th>
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
                           <td className="px-4 py-4">
                             <div className="flex items-center justify-center gap-2">
                               <div className="relative group">
                                 {item.foto_url && (
                                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                                     <img src={item.foto_url} className="h-24 w-24 object-cover rounded-lg border-2 border-primary shadow-2xl" />
                                   </div>
                                 )}
                                 <Button 
                                   variant={item.foto_url ? "default" : "outline"} 
                                   size="sm" 
                                   className={`h-9 gap-2 px-3 border-slate-200 ${!item.foto_url && (item.status === 'Danificado' || item.status === 'Substituir') ? 'border-red-500 text-red-500 animate-pulse' : ''}`}
                                   onClick={() => handleChecklistPhoto(item.id)}
                                 >
                                   <Camera className={`h-4 w-4 ${item.foto_url ? 'text-primary-foreground' : 'text-slate-400'}`} />
                                   <span className="text-[9px] font-black uppercase tracking-widest">{item.foto_url ? "Ver" : "Foto"}</span>
                                 </Button>
                               </div>
                               {!item.foto_url && (item.status === 'Danificado' || item.status === 'Substituir') && (
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
                    OS #{os.numero_os} · Cliente: {os.cliente}
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
                            <img key={idx} src={foto.foto_url} className="h-20 w-full object-cover rounded-lg border border-border shadow-sm" alt="Interna" />
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
                            <img key={idx} src={foto.foto_url} className="h-20 w-full object-cover rounded-lg border border-border shadow-sm" alt="Peça" />
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
                  {pecas.map((peca: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-border">
                          <Box className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground uppercase tracking-tight">{peca.descricao}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                            <MapPin className="h-3 w-3 text-primary" />
                            {peca.localizacao}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest mb-1 bg-slate-50 text-slate-600">Registrada</Badge>
                      </div>
                    </div>
                  ))}
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
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum serviço de terceiro registrado.</p>
                <Button variant="outline" className="mt-4 border-primary text-primary font-bold text-[10px] uppercase">Contratar Terceiro</Button>
              </div>
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
                  <p className="text-lg font-black text-foreground">R$ 0,00</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-slate-50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Materiais/Peças</p>
                  <p className="text-lg font-black text-foreground">R$ 0,00</p>
                </div>
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Custo Total</p>
                  <p className="text-lg font-black text-primary">R$ 0,00</p>
                </div>
              </div>
              <Button variant="outline" className="w-full border-dashed border-2 font-bold uppercase text-[10px] tracking-widest">Lançar Novo Custo</Button>
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
              <Button className="h-9 bg-primary text-primary-foreground font-bold uppercase text-[10px] tracking-widest px-4">Gerar Orçamento</Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum orçamento gerado para esta OS.</p>
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
    </div>
  );
}
