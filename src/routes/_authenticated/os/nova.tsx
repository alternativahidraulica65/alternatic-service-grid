import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Settings, 
  Box, 
  ClipboardCheck, 
  Camera,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/os/nova")({
  component: NovaOSPage,
});

function NovaOSPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [tipoEquipamento, setTipoEquipamento] = useState<string>("");
  const [prioridade, setPrioridade] = useState<string>("MÃ©dia");
  const [descricao, setDescricao] = useState<string>("");
  const [relatorioCliente, setRelatorioCliente] = useState<string>("");
  
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: tiposEquipamento = [] } = useQuery({
    queryKey: ['tipos_equipamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_equipamento').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const [pecas, setPecas] = useState<{id: number, nome: string, local: string}[]>([]);

  const handleAddPeca = () => {
    setPecas([...pecas, { id: Date.now(), nome: "", local: "" }]);
  };

  const handleRemovePeca = (id: number) => {
    setPecas(pecas.filter(p => p.id !== id));
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!selectedCliente) {
        toast.error("Selecione um cliente para prosseguir.");
        return;
      }
    }
    if (currentStep === 1) {
      if (!descricao.trim()) {
        toast.error("Preencha a descriÃ§Ã£o do defeito para prosseguir.");
        return;
      }
    }
    if (currentStep < 3) setCurrentStep(curr => curr + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  const handleSave = async () => {
    if (!selectedCliente || !descricao) {
      toast.error("Preencha cliente e descriÃ§Ã£o.");
      return;
    }

    setLoading(true);
    try {
      const proximoNum = `OS-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id || null;

      const { data: os, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          numero_os: proximoNum,
          cliente_id: selectedCliente,
          cliente: clientes.find(c => c.id === selectedCliente)?.nome || "Cliente Desconhecido",
          descricao: descricao,
          prioridade: prioridade,
          status: 'aberta',
          data_abertura: new Date().toISOString(),
          tipo_equipamento_id: tipoEquipamento,
          tecnico_id: currentUserId
        })
        .select()
        .single();

      if (osError) throw osError;

      if (pecas.length > 0) {
        const { error: pecasError } = await supabase
          .from('pecas_os')
          .insert(pecas.map(p => ({
            os_id: os.id,
            nome: p.nome || "PeÃ§a nÃ£o identificada",
            localizacao: p.local || "NÃ£o informado",
            criado_por: currentUserId
          })));
        
        if (pecasError) throw pecasError;
      }

      toast.success("Ordem de ServiÃ§o aberta!", {
        description: `${proximoNum} gerada com sucesso.`
      });
      
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
      router.navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error("Erro ao criar OS: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const stepsConfig = [
    { label: 'Dados BÃ¡sicos', icon: Settings },
    { label: 'Defeito Reportado', icon: ClipboardCheck },
    { label: 'PeÃ§as e Rastreio', icon: Box },
    { label: 'RevisÃ£o', icon: Save },
  ];

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">ABERTURA DE <span className="text-primary">OS / TRIAGEM</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Crie uma nova Ordem de ServiÃ§o passo a passo.</p>
        </div>
      </div>

      {/* Stepper visual */}
      <div className="relative mb-12 px-4 md:px-12">
        {/* Fundo da linha */}
        <div className="absolute top-5 left-12 right-12 h-1 bg-slate-200 -z-10 rounded-full" />
        {/* Linha preenchida */}
        <div 
          className="absolute top-5 left-12 h-1 bg-primary -z-10 transition-all duration-500 rounded-full" 
          style={{ width: `calc(${currentStep * 33.33}% - 2rem)` }}
        />
        
        <div className="flex justify-between relative z-10">
          {stepsConfig.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isActive ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 
                  isCompleted ? 'border-primary bg-primary/20 text-primary' : 
                  'border-slate-200 bg-white text-slate-300'
                }`}>
                  {isCompleted ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <Card className="border-border shadow-md border-t-4 border-t-primary animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Dados do Cliente e Equipamento
              </CardTitle>
              <CardDescription className="text-xs font-medium">Vincule a OS ao cliente correto e identifique o tipo de equipamento.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente *</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="h-11 border-border">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">RelatÃ³rio Cliente (Opcional)</Label>
                <Input 
                  placeholder="Ex: REL-2024-001" 
                  className="h-11 border-border" 
                  value={relatorioCliente}
                  onChange={(e) => setRelatorioCliente(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Equipamento</Label>
                <Select value={tipoEquipamento} onValueChange={setTipoEquipamento}>
                  <SelectTrigger className="h-11 border-border">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEquipamento?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger className="h-11 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="MÃ©dia">MÃ©dia</SelectItem>
                    <SelectItem value="Alta">Alta (Urgente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card className="border-border shadow-md border-t-4 border-t-primary animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                DescriÃ§Ã£o do Defeito
              </CardTitle>
              <CardDescription className="text-xs font-medium">Informe os detalhes reportados sobre o problema.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relato do Problema *</Label>
                <Textarea 
                  placeholder="Descreva detalhadamente os problemas relatados pelo cliente e as condiÃ§Ãµes de operaÃ§Ã£o, se aplicÃ¡vel..." 
                  className="min-h-[200px] border-border text-sm"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-border shadow-md border-l-4 border-l-amber-500">
              <CardContent className="pt-6 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 uppercase">AtenÃ§Ã£o ao Rastreamento</p>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    Registre todos os componentes, manuais ou partes pequenas que foram recebidas junto com o equipamento para garantir controle do acervo fÃ­sico.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                    <Box className="h-5 w-5 text-primary" />
                    Guarda de PeÃ§as
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddPeca} className="h-9 border-primary text-primary hover:bg-primary/5 font-bold text-[10px] uppercase">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar PeÃ§a
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {pecas.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 border-2 border-dashed border-border rounded-xl">
                    <Box className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Nenhuma peÃ§a registrada ainda</p>
                    <Button variant="link" onClick={handleAddPeca} className="text-xs text-primary font-bold mt-2">Clique aqui para comeÃ§ar</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pecas.map((peca) => (
                      <div key={peca.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-slate-50/50 group">
                        <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors cursor-pointer">
                          <Camera className="h-5 w-5" />
                        </div>
                        <Input 
                          placeholder="Ex: Cabo de forÃ§a, Placa controladora..." 
                          className="h-11 text-xs font-bold border-border bg-white flex-1" 
                          value={peca.nome}
                          onChange={(e) => setPecas(pecas.map(p => p.id === peca.id ? { ...p, nome: e.target.value } : p))}
                        />
                        <Input 
                          placeholder="Gaveta / Local" 
                          className="h-11 text-xs font-bold border-border bg-white w-40" 
                          value={peca.local}
                          onChange={(e) => setPecas(pecas.map(p => p.id === peca.id ? { ...p, local: e.target.value } : p))}
                        />
                        <Button variant="ghost" size="icon" className="h-11 w-11 text-red-400 hover:text-red-500 hover:bg-red-50 shrink-0" onClick={() => handleRemovePeca(peca.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 3 && (
          <Card className="border-border shadow-md border-t-4 border-t-primary animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-slate-900 text-white border-b border-white/10">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                RevisÃ£o Final e CriaÃ§Ã£o
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">Verifique os dados informados antes de confirmar a abertura.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Cliente</span>
                    <span className="font-bold text-slate-900 text-base">{clientes.find(c => c.id === selectedCliente)?.nome || "NÃ£o selecionado"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Tipo de Equipamento</span>
                    <span className="font-bold text-slate-900 text-base">{tiposEquipamento?.find(t => t.id === tipoEquipamento)?.nome || "NÃ£o selecionado"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Prioridade</span>
                    <span className={`font-bold text-base ${prioridade === 'Alta' ? 'text-red-600' : 'text-slate-900'}`}>{prioridade}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">RelatÃ³rio Vinculado</span>
                    <span className="font-bold text-slate-900 text-base">{relatorioCliente || "Nenhum"}</span>
                  </div>
                  <div className="col-span-2 mt-2 pt-4 border-t border-slate-200">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-2">Defeito Reportado</span>
                    <p className="text-slate-700 italic bg-white p-3 rounded border border-slate-200">{descricao || "NÃ£o informado"}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-3">PeÃ§as em Rastreabilidade ({pecas.length})</span>
                  {pecas.length > 0 ? (
                    <ul className="space-y-2">
                      {pecas.map(p => (
                        <li key={p.id} className="flex items-center gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">
                          <Box className="h-4 w-4 text-slate-400" /> 
                          <span className="font-bold flex-1">{p.nome || 'Item sem nome'}</span>
                          <span className="text-[10px] font-black uppercase text-muted-foreground bg-slate-100 px-2 py-1 rounded">{p.local || 'Local NÃ£o Informado'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 italic block py-2">Nenhuma peÃ§a registrada para guarda.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
        <Button 
          variant="outline" 
          onClick={handlePrev}
          disabled={currentStep === 0 || loading}
          className="border-border text-xs font-bold uppercase tracking-widest h-12 px-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        
        {currentStep < 3 ? (
          <Button 
            onClick={handleNext}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-widest h-12 px-8 shadow-lg"
          >
            PrÃ³ximo Passo <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSave}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:brightness-110 text-xs font-black uppercase tracking-widest h-12 px-10 shadow-lg shadow-primary/30"
          >
            {loading ? "Processando..." : "Finalizar Abertura"} {!loading && <Save className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
