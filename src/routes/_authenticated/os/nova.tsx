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
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  X

} from "lucide-react";
import { useState, useEffect } from "react";
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
  const [prioridade, setPrioridade] = useState<string>("Média");
  const [descricao, setDescricao] = useState<string>("");
  const [relatorioCliente, setRelatorioCliente] = useState<string>("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [pecas, setPecas] = useState<{id: number, nome: string, local: string}[]>([]);
  
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: clienteDetails } = useQuery({
    queryKey: ['cliente_detalhes', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return null;
      const { data, error } = await supabase.from('clientes').select('id, nome, ultimo_numero_orcamento').eq('id', selectedCliente).single();
      if (error) {
        console.warn("Erro ao buscar detalhes do cliente", error);
        return null;
      }
      return data as any;
    },
    enabled: !!selectedCliente
  });

  useEffect(() => {
    if (clienteDetails) {
      const ultimo = clienteDetails.ultimo_numero_orcamento || 0;
      const proximo = ultimo + 1;
      setRelatorioCliente(`REL-${new Date().getFullYear()}-${proximo.toString().padStart(3, '0')}`);
    } else {
      setRelatorioCliente("");
    }
  }, [clienteDetails]);

  const { data: tiposEquipamento = [] } = useQuery({
    queryKey: ['tipos_equipamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_equipamento').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });

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
        toast.error("Preencha a descrição do defeito para prosseguir.");
        return;
      }
      if (fotos.length < 2) {
        toast.error("Adicione pelo menos 2 fotos do equipamento (obrigatório).");
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
      toast.error("Preencha cliente e descrição.");
      return;
    }
    if (fotos.length < 2) {
      toast.error("Adicione pelo menos 2 fotos do equipamento.");
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

      // Upload das fotos
      const uploadedFotos = [];
      for (let i = 0; i < fotos.length; i++) {
        const file = fotos[i];
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${os.id}/triagem/foto-${i}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('os-assets').upload(fileName, file);
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
            uploadedFotos.push({
              os_id: os.id,
              foto_url: urlData.publicUrl,
              tipo: 'triagem'
            });
          }
        }
      }
      
      if (uploadedFotos.length > 0) {
        await supabase.from('os_fotos_anexos').insert(uploadedFotos);
      }

      if (pecas.length > 0) {
        const { error: pecasError } = await supabase
          .from('pecas_os')
          .insert(pecas.map(p => ({
            os_id: os.id,
            nome: p.nome || "Peça não identificada",
            localizacao: p.local || "Não informado",
            criado_por: currentUserId
          })));
        
        if (pecasError) throw pecasError;
      }
      
      // Atualizar o número de orçamento do cliente (incrementar)
      if (clienteDetails) {
        const novoNumero = (clienteDetails.ultimo_numero_orcamento || 0) + 1;
        await supabase.from('clientes').update({ ultimo_numero_orcamento: novoNumero }).eq('id', selectedCliente);
      }

      toast.success("Ordem de Serviço aberta!", {
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




  return (
    <div className="space-y-8 p-6 md:p-10 pb-20 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">ABERTURA DE <span className="text-primary">OS / TRIAGEM</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Crie uma nova Ordem de Serviço passo a passo.</p>
        </div>
      </div>




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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relatório Cliente (Automático)</Label>
                <Input 
                  placeholder="Selecione um cliente..." 
                  className="h-11 border-border bg-slate-100 cursor-not-allowed font-mono text-slate-600" 
                  value={relatorioCliente}
                  readOnly
                  disabled
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
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta (Urgente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-border shadow-md border-t-4 border-t-primary">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Descrição do Defeito
                </CardTitle>
                <CardDescription className="text-xs font-medium">Informe os detalhes reportados sobre o problema.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relato do Problema *</Label>
                  <Textarea 
                    placeholder="Descreva detalhadamente os problemas relatados pelo cliente e as condições de operação, se aplicável..." 
                    className="min-h-[160px] border-border text-sm"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md border-t-4 border-t-primary">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Fotos do Equipamento
                </CardTitle>
                <CardDescription className="text-xs font-medium text-amber-600 font-bold">São necessárias no mínimo 2 fotos para criar a OS.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {fotos.map((foto, index) => (
                    <div key={index} className="relative aspect-square rounded-xl border border-border overflow-hidden group shadow-sm">
                      <img src={URL.createObjectURL(foto)} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="icon" onClick={() => {
                          setFotos(fotos.filter((_, i) => i !== index));
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <label className="relative aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center cursor-pointer bg-slate-50">
                    <Camera className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-[10px] font-bold uppercase text-slate-500 text-center px-2">
                      Adicionar Foto
                    </span>
                    <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => {
                      if (e.target.files?.length) {
                        setFotos([...fotos, ...Array.from(e.target.files)]);
                      }
                    }} />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-border shadow-md border-l-4 border-l-amber-500">
              <CardContent className="pt-6 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 uppercase">Atenção ao Rastreamento</p>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    Registre todos os componentes, manuais ou partes pequenas que foram recebidas junto com o equipamento para garantir controle do acervo físico.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                    <Box className="h-5 w-5 text-primary" />
                    Guarda de Peças
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddPeca} className="h-9 border-primary text-primary hover:bg-primary/5 font-bold text-[10px] uppercase">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Peça
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {pecas.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 border-2 border-dashed border-border rounded-xl">
                    <Box className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Nenhuma peça registrada ainda</p>
                    <Button variant="link" onClick={handleAddPeca} className="text-xs text-primary font-bold mt-2">Clique aqui para começar</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pecas.map((peca) => (
                      <div key={peca.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-slate-50/50 group">
                        <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors cursor-pointer">
                          <Camera className="h-5 w-5" />
                        </div>
                        <Input 
                          placeholder="Ex: Cabo de força, Placa controladora..." 
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
                Revisão Final e Criação
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">Verifique os dados informados antes de confirmar a abertura.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Cliente</span>
                    <span className="font-bold text-slate-900 text-base">{clientes.find(c => c.id === selectedCliente)?.nome || "Não selecionado"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Tipo de Equipamento</span>
                    <span className="font-bold text-slate-900 text-base">{tiposEquipamento?.find(t => t.id === tipoEquipamento)?.nome || "Não selecionado"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Prioridade</span>
                    <span className={`font-bold text-base ${prioridade === 'Alta' ? 'text-red-600' : 'text-slate-900'}`}>{prioridade}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-1">Relatório Vinculado</span>
                    <span className="font-bold text-slate-900 text-base">{relatorioCliente || "Nenhum"}</span>
                  </div>
                  <div className="col-span-2 mt-2 pt-4 border-t border-slate-200">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-2">Defeito Reportado</span>
                    <p className="text-slate-700 italic bg-white p-3 rounded border border-slate-200">{descricao || "Não informado"}</p>
                  </div>
                  <div className="col-span-2 mt-2 pt-4 border-t border-slate-200">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-2 w-full">Fotos Anexadas ({fotos.length})</span>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {fotos.map((f, i) => (
                         <img key={i} src={URL.createObjectURL(f)} className="h-16 w-16 object-cover rounded shadow-sm border border-border shrink-0" />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block mb-3">Peças em Rastreabilidade ({pecas.length})</span>
                  {pecas.length > 0 ? (
                    <ul className="space-y-2">
                      {pecas.map(p => (
                        <li key={p.id} className="flex items-center gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">
                          <Box className="h-4 w-4 text-slate-400" /> 
                          <span className="font-bold flex-1">{p.nome || 'Item sem nome'}</span>
                          <span className="text-[10px] font-black uppercase text-muted-foreground bg-slate-100 px-2 py-1 rounded">{p.local || 'Local Não Informado'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 italic block py-2">Nenhuma peça registrada para guarda.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
            Criar OS <ChevronRight className="ml-2 h-4 w-4" />
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