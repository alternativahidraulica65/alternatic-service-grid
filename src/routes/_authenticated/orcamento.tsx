import { createFileRoute, useRouter } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Settings, 
  Calculator, 
  TrendingUp, 
  Save, 
  FileText,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  ChevronDown,
  DollarSign,
  Info
} from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/orcamento")({
  component: OrcamentoPage,
});

function OrcamentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showInternalCosts, setShowInternalCosts] = useState(true);
  const [selectedOSId, setSelectedOSId] = useState<string>("");

  const { data: ordens = [] } = useQuery({
    queryKey: ['os_orcamento_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordens_servico').select('*').in('status', ['aberta', 'vistoria', 'orcamento_pendente']);
      if (error) throw error;
      return data;
    }
  });

  const { data: itens = [] } = useQuery({
    queryKey: ['orcamento_itens', selectedOSId],
    queryFn: async () => {
      if (!selectedOSId) return [];
      const { data, error } = await supabase.from('os_custos' as any).select('*').eq('os_id', Number(selectedOSId));
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOSId
  });

  const selectedOS = ordens.find((o: any) => String(o.id) === selectedOSId);

  const totais = useMemo(() => {
    const custo = itens.reduce((acc: number, item: any) => acc + Number(item.valor_total_custo || 0), 0);
    const venda = itens.reduce((acc: number, item: any) => acc + Number(item.valor_total_custo || 0) * 1.3, 0);
    const lucro = venda - custo;
    const margemGeral = venda > 0 ? (lucro / venda) * 100 : 0;
    
    return { custo, venda, lucro, margemGeral };
  }, [itens]);

  const handleSave = async () => {
    if (!selectedOSId) {
      toast.error("Selecione uma OS primeiro.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          status: 'orcamento_pendente',
          valor_final: totais.venda,
          margem_lucro_aplicada: totais.margemGeral
        } as any)
        .eq('id', Number(selectedOSId));

      if (error) throw error;

      toast.success("Orçamento gerado!", {
        description: "Status atualizado para orcamento_pendente.",
      });
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">ORÇAMENTO / <span className="text-primary">PREÇIFICAÇÃO</span></h2>
            <div className="flex items-center gap-2 mt-1">
              <Select value={selectedOSId} onValueChange={setSelectedOSId}>
                <SelectTrigger className="h-9 w-64 border-border font-bold text-[10px] uppercase">
                  <SelectValue placeholder="Selecione a OS..." />
                </SelectTrigger>
                <SelectContent>
                  {ordens.map((os: any) => (
                    <SelectItem key={os.id} value={String(os.id)}>OS #{os.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4 px-3 py-1.5 rounded-full bg-slate-100 border border-border">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Visão Custo</span>
            <Switch checked={showInternalCosts} onCheckedChange={setShowInternalCosts} className="scale-75" />
          </div>
          <Button variant="outline" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
            <FileText className="mr-2 h-4 w-4 text-primary" />
            Gerar PDF
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
            className="h-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6"
          >
            {loading ? "Salvando..." : "Salvar Orçamento"}
            <Save className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Tabela de Itens */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold uppercase tracking-widest">Materiais e Serviços</CardTitle>
              </div>
              <Button size="sm" className="h-9 bg-slate-900 text-white hover:bg-slate-800 font-bold text-[10px] uppercase">
                <Plus className="mr-2 h-4 w-4 text-primary" />
                Adicionar Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Descrição do Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Tipo</TableHead>
                    {showInternalCosts && <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right">Custo (R$)</TableHead>}
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right">Margem (%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right pr-6">Preço Venda (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item: any) => (
                    <TableRow key={item.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-4 pl-6">
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">{item.descricao}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-white">
                          {item.categoria}
                        </Badge>
                      </TableCell>
                      {showInternalCosts && (
                        <TableCell className="py-4 text-right font-medium text-slate-500">
                          {Number(item.valor_total_custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      )}
                      <TableCell className="py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1 font-black text-primary">
                          {item.margem_lucro_percentual || 0}%
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6 font-black text-foreground">
                        {(Number(item.valor_total_custo || 0) * 1.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border shadow-md border-l-4 border-l-primary">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest">Condições Comerciais</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prazo de Entrega (Dias)</Label>
                    <Input defaultValue="5" className="h-10 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Validade (Dias)</Label>
                    <Input defaultValue="15" className="h-10 border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Forma de Pagamento</Label>
                  <Select defaultValue="28dd">
                    <SelectTrigger className="h-10 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avante">À Vista (Desconto 5%)</SelectItem>
                      <SelectItem value="28dd">Boleto 28 Dias</SelectItem>
                      <SelectItem value="28/56">28 / 56 Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md bg-amber-50 border-amber-200">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900 uppercase">Simulação de Impostos</p>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Este orçamento não inclui IPI. O valor final da nota fiscal pode variar conforme a tributação do cliente (ICMS/ISS).
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-amber-200 space-y-2">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-amber-800">
                     <span>Cálculo Simples Nacional</span>
                     <span>9.5%</span>
                   </div>
                   <div className="flex justify-between items-center text-xs font-black text-amber-900">
                     <span>Valor Imposto Est.</span>
                     <span>R$ {(totais.venda * 0.095).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-xl bg-slate-900 text-white overflow-hidden sticky top-8">
            <CardHeader className="bg-slate-800/50 border-b border-white/5">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subtotal de Venda</p>
                    <p className="text-3xl font-black text-white leading-none">
                      R$ {totais.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest px-2 py-1">Sem Impostos</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      Margem Bruta
                    </p>
                    <p className="text-xl font-black text-emerald-400 leading-none">
                      {totais.margemGeral.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-primary" />
                      Lucro Previsto
                    </p>
                    <p className="text-xl font-black text-white leading-none">
                      R$ {totais.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, notation: 'compact' })}
                    </p>
                  </div>
                </div>

                {showInternalCosts && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Custo Operacional Interno</p>
                      <Info className="h-3 w-3 text-red-400 opacity-50" />
                    </div>
                    <p className="text-lg font-black text-red-500">
                      R$ {totais.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Comissão Vendedor (5%)</span>
                   </div>
                   <span className="text-sm font-black text-primary">R$ {(totais.venda * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <Button className="w-full h-14 bg-primary text-primary-foreground hover:bg-white hover:text-slate-900 font-black uppercase tracking-[0.2em] text-xs transition-all shadow-[0_0_20px_rgba(255,215,0,0.15)] group">
                  ENVIAR PARA APROVAÇÃO
                  <ChevronDown className="ml-2 h-4 w-4 group-hover:translate-y-1 transition-transform" />
                </Button>
                
                <p className="text-[9px] text-center font-bold text-slate-600 uppercase tracking-widest">
                  Este orçamento será processado para: <br/>
                  <span className="text-slate-400">{selectedOS ? `OS #${(selectedOS as any).id}` : "Nenhuma OS selecionada"}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
