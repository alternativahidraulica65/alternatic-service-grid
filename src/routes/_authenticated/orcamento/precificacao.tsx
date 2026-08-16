import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  UserCheck, 
  ShieldCheck, 
  ChevronRight,
  Calculator,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle
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
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/orcamento/precificacao")({
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  const queryClient = useQueryClient();
  const [selectedOSId, setSelectedOSId] = useState<string>("");
  const [margem, setMargem] = useState<number>(30);
  const [regraComissao, setRegraComissao] = useState<"padrao" | "divisao_50_50">("padrao");
  const [loading, setLoading] = useState(false);

  const { data: orders } = useSuspenseQuery({
    queryKey: ['ordens_servico_pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .in('status', ['aberta', 'orcamento_pendente']);
      if (error) throw error;
      return data;
    }
  });

  const { data: custos } = useSuspenseQuery({
    queryKey: ['custos_os_selecionada', selectedOSId],
    queryFn: async () => {
      if (!selectedOSId) return [];
      const { data, error } = await supabase
        .from('custos_os')
        .select('*')
        .eq('os_id', selectedOSId);
      if (error) throw error;
      return data;
    },
  });

  const selectedOS = orders?.find(o => o.id === selectedOSId);
  const custoTotal = custos?.reduce((acc, curr) => acc + (Number(curr.custo_interno) || 0), 0) || 0;

  
  // Preço Venda = Custo / (1 - Margem/100)
  const precoVenda = custoTotal / (1 - margem / 100);
  const lucroBruto = precoVenda - custoTotal;
  
  // Comissão 50/50: Metade do lucro bruto
  // Padrão: 5% do valor de venda (exemplo)
  const comissao = regraComissao === "divisao_50_50" ? lucroBruto * 0.5 : precoVenda * 0.05;

  const handleAprovar = async () => {
    if (!selectedOSId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'orcamento_pendente',
          valor_total: precoVenda,
          margem_lucro: margem
        })
        .eq('id', selectedOSId);

      if (error) throw error;

      toast.success("Orçamento precificado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    } catch (e: any) {
      toast.error("Erro ao aprovar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 industrial-theme pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Precificação e Lucratividade</h1>
          </div>
          <Button 
            className="btn-industrial" 
            onClick={handleAprovar}
            disabled={!selectedOSId || loading}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {loading ? "Processando..." : "Aprovar Precificação"}
          </Button>
        </div>
      </header>

      <main className="container-industrial mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Seleção de Ordem de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={setSelectedOSId} value={selectedOSId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma OS para precificar..." />
                </SelectTrigger>
                <SelectContent>
                  {orders?.map(os => (
                    <SelectItem key={os.id} value={os.id}>
                      {os.numero_os} - {os.cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedOSId && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Resumo de Custos Levantados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {custos?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <div>
                        <p className="font-medium text-slate-900">{item.descricao}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{item.categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-slate-900">R$ {(Number(item.custo_interno) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>

                    </div>
                  ))}
                  {custos?.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      Nenhum custo lançado para esta OS.
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center py-2 bg-slate-50 px-4 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">CUSTO TOTAL (CPV)</span>
                    <span className="text-lg font-mono font-bold text-slate-900">
                      R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-lg border-2 border-primary/20 bg-slate-900 text-white">
            <CardHeader className="bg-slate-800/50 pb-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulador de Margem
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase">Margem Alvo (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input 
                        type="number" 
                        value={margem} 
                        onChange={(e) => setMargem(Number(e.target.value))}
                        className="bg-slate-800 border-slate-700 pl-10 text-primary font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase">Regra de Comissão</Label>
                    <Select value={regraComissao} onValueChange={(v: any) => setRegraComissao(v)}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padrao">Padrão (5%)</SelectItem>
                        <SelectItem value="divisao_50_50">Divisão 50/50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Lucro Bruto Esperado</span>
                    <span className="font-mono text-emerald-400">
                      + R$ {lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Comissão (Previsão)</span>
                    <span className="font-mono text-amber-400">
                      - R$ {comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-primary shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                  <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-1">Preço Sugerido ao Cliente</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-black text-sm font-bold">R$</span>
                    <span className="text-black text-3xl font-black tracking-tighter">
                      {precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-bold mb-1 underline">Atenção Diretor:</p>
                A margem mínima recomendada para serviços hidráulicos é de 25%. Valores abaixo disto podem comprometer a garantia e custos logísticos.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}