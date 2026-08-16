import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft,
  Wrench,
  Camera,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreVertical,
  Box,
  ClipboardCheck,
  Factory
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
  head: () => ({
    meta: [
      { title: "Kanban Operador — Alternativa Hidráulica" },
      { name: "description", content: "Gerenciamento de fila de trabalho e vistoria técnica." },
    ],
  }),
});

const COLUNAS = [
  { id: 'triagem', label: 'Triagem' },
  { id: 'desmontagem', label: 'Desmontagem' },
  { id: 'usinagem', label: 'Em Usinagem' },
  { id: 'montagem', label: 'Montagem' },
  { id: 'pronto', label: 'Pronto' },
];

const COMPONENTES_CILINDRO = [
  { id: 'embolo', label: 'Êmbolo' },
  { id: 'haste', label: 'Haste' },
  { id: 'parafusos', label: 'Parafusos e Porcas' },
  { id: 'olhal', label: 'Olhal e Conexões' },
  { id: 'roscas', label: 'Roscas e Pintura' },
];

function KanbanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const [selectedOS, setSelectedOS] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Vistoria State
  const [vistoria, setVistoria] = useState<Record<string, { estado: string, obs: string }>>({});
  
  // Guarda State
  const [guarda, setGuarda] = useState({ descricao: "", localizacao: "" });
  const [file, setFile] = useState<File | null>(null);

  const { data: orders } = useSuspenseQuery({
    queryKey: ['ordens_servico_kanban'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordens_servico').select('*');
      if (error) throw error;
      return data;
    }
  });

  const handleOpenOS = (order: any) => {
    setSelectedOS(order);
    // Reset states
    setVistoria({});
    setGuarda({ descricao: "", localizacao: "" });
    setFile(null);
  };

  const handleSaveVistoria = async () => {
    if (!selectedOS) return;
    setLoading(true);
    try {
      // 1. Salvar Checklists
      const checklistEntries = Object.entries(vistoria).map(([comp, val]) => ({
        os_id: selectedOS.id,
        componente: comp,
        estado: val.estado,
        observacao_tecnica: val.obs,
        criado_por: user.id
      }));

      if (checklistEntries.length > 0) {
        const { error: chkError } = await supabase.from('os_checklist_tecnico').insert(checklistEntries);
        if (chkError) throw chkError;
      }

      // 2. Salvar Guarda de Peças e Foto
      if (guarda.descricao && guarda.localizacao) {
        const { data: guardaPeca, error: guardaError } = await supabase
          .from('os_guarda_pecas')
          .insert({
            os_id: selectedOS.id,
            descricao: guarda.descricao,
            localizacao: guarda.localizacao,
            criado_por: user.id
          })
          .select()
          .single();
        
        if (guardaError) throw guardaError;

        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${selectedOS.id}/guarda_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('os-assets')
            .upload(fileName, file);
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('os-assets').getPublicUrl(fileName);
            await supabase.from('os_fotos_anexos').insert({
              os_id: selectedOS.id,
              peca_id: guardaPeca.id,
              foto_url: urlData.publicUrl,
              tipo: 'vistoria',
              criado_por: user.id
            });
          }
        }
      }

      // 3. Atualizar Status da OS (Ex: Desmontagem -> Usinagem)
      let nextStatus = selectedOS.status;
      if (selectedOS.status === 'triagem') nextStatus = 'desmontagem';
      else if (selectedOS.status === 'desmontagem') nextStatus = 'usinagem';
      else if (selectedOS.status === 'usinagem') nextStatus = 'montagem';
      else if (selectedOS.status === 'montagem') nextStatus = 'pronto';

      const { error: updateError } = await supabase
        .from('ordens_servico')
        .update({ status: nextStatus })
        .eq('id', selectedOS.id);

      if (updateError) throw updateError;

      toast.success("Vistoria salva e status atualizado!");
      setSelectedOS(null);
      queryClient.invalidateQueries({ queryKey: ['ordens_servico_kanban'] });
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 industrial-theme">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: "/dashboard" })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Fila da Oficina</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-slate-900 text-primary border-none hidden sm:flex">
              Operação em Tempo Real
            </Badge>
          </div>
        </div>
      </header>

      <main className="container-industrial py-6">
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
          {COLUNAS.map(coluna => (
            <div key={coluna.id} className="min-w-[300px] w-[300px] flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 py-1 bg-slate-200/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_rgba(255,215,0,0.8)]" />
                  <h2 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">{coluna.label}</h2>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono bg-white">
                  {orders?.filter(o => o.status === coluna.id).length || 0}
                </Badge>
              </div>
              
              <div className="flex flex-col gap-3 min-h-[500px]">
                {orders?.filter(o => o.status === coluna.id).map(order => (
                  <Card 
                    key={order.id} 
                    className="cursor-pointer border-slate-200 hover:border-primary hover:shadow-lg transition-all active:scale-[0.98] group bg-white"
                    onClick={() => handleOpenOS(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-bold text-primary bg-slate-900 px-2 py-0.5 rounded">
                          {order.numero_os}
                        </span>
                        <MoreVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-600" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1 truncate">{order.cliente}</h3>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{order.descricao}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {order.criado_em ? new Date(order.criado_em).toLocaleDateString() : '—'}
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase border-slate-200 text-slate-500">
                          Ação Necessária
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal de Vistoria / Detalhes */}
      <Dialog open={!!selectedOS} onOpenChange={(open) => !open && setSelectedOS(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto industrial-theme">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-primary text-primary-foreground">{selectedOS?.numero_os}</Badge>
              <Badge variant="outline" className="uppercase text-[10px]">{selectedOS?.status}</Badge>
            </div>
            <DialogTitle className="text-2xl font-display">{selectedOS?.cliente}</DialogTitle>
            <DialogDescription>Execução de vistoria técnica e guarda de componentes.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="vistoria" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
              <TabsTrigger value="vistoria" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">
                <Wrench className="w-4 h-4 mr-2" />
                Vistoria Técnica
              </TabsTrigger>
              <TabsTrigger value="guarda" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold">
                <Box className="w-4 h-4 mr-2" />
                Guarda de Peças
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vistoria" className="space-y-6 py-4">
              <div className="space-y-4">
                {COMPONENTES_CILINDRO.map(comp => (
                  <div key={comp.id} className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-slate-900">{comp.label}</Label>
                      <div className="flex gap-2">
                        {['aprovado', 'recuperacao', 'substituir'].map(estado => (
                          <Button
                            key={estado}
                            size="sm"
                            variant={vistoria[comp.id]?.estado === estado ? 'default' : 'outline'}
                            className={`text-[10px] h-7 px-2 ${
                              vistoria[comp.id]?.estado === estado 
                                ? (estado === 'aprovado' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                                   estado === 'recuperacao' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600')
                                : ''
                            }`}
                            onClick={() => setVistoria(prev => ({
                              ...prev, 
                              [comp.id]: { estado, obs: prev[comp.id]?.obs || "" }
                            }))}
                          >
                            {estado === 'aprovado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {estado === 'recuperacao' && <Clock className="w-3 h-3 mr-1" />}
                            {estado === 'substituir' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {estado.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea 
                      placeholder="Observações técnicas sobre este componente..." 
                      className="bg-white text-xs h-16"
                      value={vistoria[comp.id]?.obs || ""}
                      onChange={(e) => {
                        const obs = e.target.value;
                        setVistoria(prev => ({
                          ...prev,
                          [comp.id]: { estado: prev[comp.id]?.estado || "aprovado", obs }
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="guarda" className="space-y-6 py-4">
              <Card className="border-2 border-dashed border-slate-200">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição da Peça</Label>
                      <Input 
                        placeholder="Ex: Porca da Haste" 
                        value={guarda.descricao}
                        onChange={(e) => setGuarda({ ...guarda, descricao: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Local na Oficina</Label>
                      <Input 
                        placeholder="Ex: Caixa 05 / Gaveta B" 
                        value={guarda.localizacao}
                        onChange={(e) => setGuarda({ ...guarda, localizacao: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Evidência Fotográfica</Label>
                    <div className="flex items-center justify-center border-2 border-dashed rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                      {file ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                          <p className="text-sm font-bold text-slate-700">{file.name}</p>
                          <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="mt-2 text-red-500">Trocar</Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <Camera className="h-10 w-10 mb-2" />
                          <p className="text-sm">Clique ou arraste para enviar foto</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setSelectedOS(null)}>Cancelar</Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              onClick={handleSaveVistoria}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Processando..." : "Salvar Vistoria e Avançar OS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
