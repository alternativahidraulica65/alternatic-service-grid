import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  Box, 
  Settings, 
  Wrench, 

  ClipboardCheck, 
  UserCheck,
  Save,
  Trash2,
  ChevronRight,
  Clock,
  Factory,
  Eye,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/nova-os")({
  component: NovaOSPage,
  head: () => ({
    meta: [
      { title: "Triagem e Nova OS — Alternativa Hidráulica" },
      { name: "description", content: "Abertura de nova OS e triagem de equipamentos." },
    ],
  }),
});

type Peca = {
  id?: string;
  nome: string;
  localizacao: string;
  foto_url?: string;
  file?: File;
};

function NovaOSPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAdmin, roles } = Route.useRouteContext();

  // RBAC Override for Admins
  const [activeView, setActiveView] = useState<string | null>(null);
  
  useEffect(() => {
    if (isAdmin && !activeView) {
      setActiveView("diretor");
    } else if (!isAdmin) {
      setActiveView(roles[0] || "operador");
    }
  }, [isAdmin, roles]);

  const ViewSwitcher = () => {
    if (!isAdmin) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/5 mr-2">
            <Eye className="mr-2 h-4 w-4" />
            Visão: {activeView?.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Simulador RBAC
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveView("diretor")}>Diretor</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("financeiro")}>Financeiro</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("gestor")}>Gestor</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("operador")}>Operador</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Form State
  const [cliente, setCliente] = useState("");
  const [tipoEquipamento, setTipoEquipamento] = useState<string>("");
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [checklist, setChecklist] = useState<{label: string, checked: boolean}[]>([]);
  const [loading, setLoading] = useState(false);

  // Queries
  const { data: companies } = useSuspenseQuery({
    queryKey: ['empresas_emissoras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas_emissoras').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: tiposEquipamento, isLoading: loadingTipos } = useQuery({
    queryKey: ['tipos_equipamento'],
    queryFn: async () => {
      console.log("Fetching tipos_equipamento...");
      const { data, error } = await supabase.from('tipos_equipamento').select('*').order('nome');
      if (error) {
        console.error("Error fetching tipos_equipamento:", error);
        throw error;
      }
      console.log("Tipos fetched:", data);
      return data;
    },
    staleTime: 0, // Force fresh fetch
  });

  const { data: torneiroFila } = useQuery({
    queryKey: ['torneiro_fila'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('status', 'em_andamento')
        .ilike('descricao', '%torneiro%'); // Simplificação para o dashboard
      if (error) throw error;
      return data;
    }
  });

  const { data: templates } = useQuery({
    queryKey: ['checklist_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('checklist_templates').select('*');
      if (error) throw error;
      return data as any[];
    }
  });

  useEffect(() => {
    if (tipoEquipamento && templates) {
      const template = templates.find((t: any) => t.tipo_equipamento_id === tipoEquipamento);
      if (template && template.itens) {
        setChecklist((template.itens as any[]).map((item: any) => ({ label: item.label, checked: false })));
      } else {
        setChecklist([]);
      }
    }
  }, [tipoEquipamento, templates]);

  const handleAddPeca = () => {
    setPecas([...pecas, { nome: "", localizacao: "" }]);
  };

  const handleRemovePeca = (index: number) => {
    const newPecas = [...pecas];
    newPecas.splice(index, 1);
    setPecas(newPecas);
  };

  const handlePecaChange = (index: number, field: keyof Peca, value: any) => {
    const newPecas = [...pecas];
    newPecas[index] = { ...newPecas[index], [field]: value } as Peca;
    setPecas(newPecas);
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePecaChange(index, 'file', file);
      handlePecaChange(index, 'foto_url', URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!cliente || !tipoEquipamento) {
      toast.error("Preencha o cliente e o tipo de equipamento");
      return;
    }

    setLoading(true);
    try {
      // 1. Criar OS
      const numeroOS = `OS-${Math.floor(1000 + Math.random() * 9000)}`;
      const tipoEquipamentoNome = tiposEquipamento?.find((t: any) => t.id === tipoEquipamento)?.nome || "";
      
      const { data: os, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          cliente,
          numero_os: numeroOS,
          status: 'aberta',
          descricao: `Triagem de ${tipoEquipamentoNome}`,
          empresa_id: companies?.[0]?.id || null,
          tipo_equipamento_id: tipoEquipamento, // Salva o ID do tipo
          tecnico_id: user.id // Associa o criador como técnico inicial se for operador
        })
        .select()
        .single();

      if (osError) {
        console.error("OS Insert Error:", osError);
        throw osError;
      }

      // 2. Upload de fotos e salvar peças
      for (const peca of pecas) {
        let fotoUrl = null;
        if (peca.file) {
          const fileExt = peca.file.name.split('.').pop();
          const fileName = `${os.id}/${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('os-assets')
            .upload(fileName, peca.file);
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
            fotoUrl = urlData.publicUrl;
          }
        }

        await supabase.from('pecas_os').insert({
          os_id: os.id,
          nome: peca.nome,
          localizacao: peca.localizacao,
          foto_url: fotoUrl,
          criado_por: user.id
        });
      }

      toast.success(`Ordem de Serviço ${numeroOS} criada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
      router.navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 industrial-theme">
      {/* Header Fixo */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Nova OS / Triagem</h1>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher />
            <Button 
              className="btn-industrial bg-primary text-primary-foreground hover:bg-primary/90" 
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Finalizar Triagem"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container-industrial mt-6 grid gap-6 lg:grid-cols-12">
        
        {/* Coluna Esquerda: Formulário e Peças */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Cabeçalho da OS */}
          <Card className="border-l-4 border-l-primary shadow-md bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Settings className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Etapa 01</span>
              </div>
              <CardTitle className="text-xl text-slate-900 font-display">Identificação do Equipamento</CardTitle>
              <CardDescription>Selecione o cliente e as especificações técnicas básicas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente" className="text-slate-700">Cliente</Label>
                <Input 
                  id="cliente" 
                  placeholder="Nome da Empresa ou Cliente" 
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="border-slate-300 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Tipo de Equipamento</Label>
                <Select onValueChange={(val: any) => setTipoEquipamento(val)}>
                  <SelectTrigger className="border-slate-300 focus:ring-primary">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEquipamento?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 1.5 Checklist Dinâmico */}
          {checklist.length > 0 && (
            <Card className="shadow-md bg-white border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Checklist Técnico</span>
                </div>
                <CardTitle className="text-xl text-slate-900 font-display">Inspeção Inicial</CardTitle>
                <CardDescription>Verifique os itens conforme o tipo de equipamento.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <input
                      type="checkbox"
                      id={`chk-${idx}`}
                      checked={item.checked}
                      onChange={(e) => {
                        const newCheck = [...checklist];
                        const itemToUpdate = newCheck[idx];
                        if (itemToUpdate) {
                          itemToUpdate.checked = e.target.checked;
                          setChecklist(newCheck);
                        }
                      }}
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <Label htmlFor={`chk-${idx}`} className="text-sm font-medium text-slate-700 cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 2. Módulo de Organização de Peças */}
          <Card className="shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Box className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Etapa 02</span>
                </div>
                <CardTitle className="text-xl text-slate-900 font-display">Guarda e Rastreabilidade</CardTitle>
                <CardDescription>Registre os componentes retirados e sua localização.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddPeca} className="border-primary text-primary hover:bg-primary/5">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Peça
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pecas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
                  <Box className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma peça registrada na triagem.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pecas.map((peca, index) => (
                    <div key={index} className="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary/50 hover:shadow-sm">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-2 h-7 w-7 text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePeca(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                            {peca.foto_url ? (
                              <img src={peca.foto_url} alt="Peça" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Camera className="h-6 w-6" />
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 cursor-pointer opacity-0"
                              onChange={(e) => handleFileChange(index, e)}
                            />
                          </div>
                          {peca && (
                            <div className="flex-1 space-y-2">
                              <Input 
                                placeholder="Nome da peça (ex: Haste)" 
                                value={peca.nome}
                                onChange={(e) => handlePecaChange(index, 'nome', e.target.value)}
                                className="h-8 text-sm border-slate-200"
                              />
                              <Input 
                                placeholder="Localização (ex: Gaveta 04)" 
                                value={peca.localizacao}
                                onChange={(e) => handlePecaChange(index, 'localizacao', e.target.value)}
                                className="h-8 text-sm border-slate-200"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Status e Fila do Torneiro */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Status da Produção */}
          <Card className="shadow-md bg-slate-900 text-white overflow-hidden border-none">
            <CardHeader className="pb-2 bg-slate-800/50">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Processo Global</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              {[
                { label: 'Triagem', icon: ClipboardCheck, status: 'current' },
                { label: 'Desmontagem', icon: Wrench, status: 'pending' },
                { label: 'Torneiro', icon: Settings, status: 'pending' },
                { label: 'Montagem', icon: Factory, status: 'pending' },
                { label: 'Teste de Bancada', icon: UserCheck, status: 'pending' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 relative">
                  {i < 4 && (
                    <div className="absolute left-[18px] top-9 w-[2px] h-6 bg-slate-700" />
                  )}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    step.status === 'current' ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'border-slate-700 bg-slate-800'
                  }`}>
                    <step.icon className={`h-4 w-4 ${step.status === 'current' ? 'text-primary' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <span className={`text-sm font-medium ${step.status === 'current' ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                    {step.status === 'current' && (
                      <Badge variant="outline" className="text-[10px] border-primary text-primary bg-primary/5">Em Fila</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Módulo do Torneiro (Gargalo) */}
          <Card className="shadow-lg border-2 border-primary/20 bg-white">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Settings className="h-5 w-5 text-primary" />
                  Fila do Torneiro
                </CardTitle>
                <Badge variant="secondary" className="bg-slate-900 text-primary font-mono text-lg px-3">
                  {torneiroFila?.length || 0}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">Monitoramento de gargalo em tempo real</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                    <span>Ocupação da Oficina</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-1.5 bg-slate-100" />
                </div>
                
                <div className="space-y-2">
                  {torneiroFila?.slice(0, 3).map((os) => (
                    <div key={os.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-default">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{os.numero_os}</p>
                        <p className="text-[10px] text-slate-500 truncate">{os.cliente}</p>
                      </div>
                      <Clock className="h-3 w-3 text-slate-400" />
                    </div>
                  ))}
                  {(!torneiroFila || torneiroFila.length === 0) && (
                    <div className="text-center py-4 text-xs text-slate-500 italic">
                      Fila liberada ou sem registros
                    </div>
                  )}
                </div>
                
                <Button variant="ghost" className="w-full text-xs text-primary font-bold hover:bg-primary/5">
                  Ver Fila Completa
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
