import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Settings, 
  Box, 
  Wrench, 
  ClipboardCheck, 
  UserCheck, 
  Factory,
  Camera,
  Plus,
  Trash2,
  Save,
  Search,
  User,
  AlertCircle,
  Loader2
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/os/nova")({
  component: NovaOSPage,
});

function NovaOSPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [tipoEquipamento, setTipoEquipamento] = useState<string>("cilindro");
  const [prioridade, setPrioridade] = useState<string>("Média");
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

  const [pecas, setPecas] = useState<{id: number, nome: string, local: string}[]>([]);

  const handleAddPeca = () => {
    setPecas([...pecas, { id: Date.now(), nome: "", local: "" }]);
  };

  const handleSave = async () => {
    if (!selectedCliente || !descricao) {
      toast.error("Preencha cliente e descrição.");
      return;
    }

    setLoading(true);
    try {
      const proximoNum = `OS-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data: os, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          numero_os: proximoNum,
          cliente_id: selectedCliente,
          cliente: clientes.find(c => c.id === selectedCliente)?.nome || "Cliente Desconhecido",
          descricao: descricao,
          prioridade: prioridade,
          status: 'aberta',
          data_abertura: new Date().toISOString()
        })
        .select()
        .single();

      if (osError) throw osError;

      if (pecas.length > 0) {
        const { error: pecasError } = await supabase
          .from('os_guarda_pecas')
          .insert(pecas.map(p => ({
            os_id: os.id,
            descricao: p.nome || "Peça não identificada",
            localizacao: p.local || "Não informado"
          })));
        
        if (pecasError) throw pecasError;
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
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: '/os' })} className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">ABERTURA DE <span className="text-primary">OS / TRIAGEM</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Entrada de equipamento e registro inicial de componentes.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Coluna Principal: Formulário */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border shadow-md overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold uppercase tracking-widest">Dados do Equipamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</Label>
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relatório Cliente (Opcional)</Label>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cilindro">Cilindro Hidráulico</SelectItem>
                    <SelectItem value="bomba">Bomba Hidráulica</SelectItem>
                    <SelectItem value="motor">Motor Hidráulico</SelectItem>
                    <SelectItem value="comando">Comando Hidráulico</SelectItem>
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
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição do Defeito</Label>
                <Textarea 
                  placeholder="Descreva os problemas relatados pelo cliente..." 
                  className="min-h-[100px] border-border" 
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Módulo de Peças Retiradas */}
          <Card className="border-border shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold uppercase tracking-widest">Guarda de Peças / Rastreabilidade</CardTitle>
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
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">Nenhuma peça registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pecas.map((peca) => (
                    <div key={peca.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-slate-50/50 group">
                      <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors cursor-pointer">
                        <Camera className="h-5 w-5" />
                      </div>
                      <Input 
                        placeholder="Nome da Peça" 
                        className="h-9 text-xs font-bold border-border bg-white" 
                        value={peca.nome}
                        onChange={(e) => setPecas(pecas.map(p => p.id === peca.id ? { ...p, nome: e.target.value } : p))}
                      />
                      <Input 
                        placeholder="Gaveta / Local" 
                        className="h-9 text-xs font-bold border-border bg-white" 
                        value={peca.local}
                        onChange={(e) => setPecas(pecas.map(p => p.id === peca.id ? { ...p, local: e.target.value } : p))}
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => setPecas(pecas.filter(p => p.id !== peca.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Resumo e Status */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-md bg-slate-900 text-white overflow-hidden">
            <CardHeader className="bg-slate-800/50 border-b border-white/5">
              <CardTitle className="text-base font-bold uppercase tracking-widest">Resumo Operacional</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                {[
                  { label: "Triagem", icon: ClipboardCheck, status: "current" },
                  { label: "Laudo Técnico", icon: Wrench, status: "pending" },
                  { label: "Orçamento", icon: Factory, status: "pending" },
                  { label: "Aprovação", icon: UserCheck, status: "pending" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-4 relative">
                    {i < 3 && <div className="absolute left-[17px] top-8 w-[2px] h-5 bg-slate-700" />}
                    <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center ${
                      step.status === 'current' ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'border-slate-700 bg-slate-800 text-slate-500'
                    }`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${step.status === 'current' ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="p-4 rounded-xl bg-primary text-primary-foreground">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Status Automático</p>
                  <p className="text-xl font-black">AGUARDANDO TRIAGEM</p>
                </div>
                
                <Button 
                  disabled={loading}
                  onClick={handleSave}
                  className="w-full h-12 bg-white text-slate-900 hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-widest transition-all"
                >
                  {loading ? "Processando..." : "Finalizar Abertura"}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md border-l-4 border-l-amber-500">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 uppercase">Atenção ao Rastreamento</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  Todos os componentes pequenos devem ser etiquetados e guardados em gavetas identificadas no sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
