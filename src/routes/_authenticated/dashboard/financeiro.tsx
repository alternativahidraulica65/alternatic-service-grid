import { createFileRoute } from "@tanstack/react-router";
import { 
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Plus,
  Calendar,
  Download,
  FileSpreadsheet,
  FileIcon,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/_authenticated/dashboard/financeiro")({
  component: DashboardFinanceiro,
});

function FinanceKPICard({ title, value, subtext, icon: Icon, trend, trendValue }: any) {
  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-slate-100 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-foreground">{value}</div>
        <div className="mt-1 flex items-center gap-1.5">
          {trend === "up" ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <span className={`text-[10px] font-bold ${trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
            {trendValue}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase">{subtext}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardFinanceiro() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const filterStartDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
  const filterEndDate = endOfMonth(filterStartDate);

  const { data: supplierData, isLoading } = useQuery({
    queryKey: ['supplier-costs', filterStartDate.toISOString()],
    queryFn: async () => {
      const { data: lancamentos, error: lError } = await supabase
        .from('lancamentos_financeiros')
        .select(`
          valor,
          fornecedor:fornecedores(nome, limite_mensal, cnpj),
          os_id,
          ordem_servico:ordens_servico(numero_os)
        `)
        .gte('data_competencia', filterStartDate.toISOString().split('T')[0])
        .lte('data_competencia', filterEndDate.toISOString().split('T')[0])
        .eq('tipo', 'saida');

      if (lError) throw lError;

      const grouped = (lancamentos || []).reduce((acc: any, curr: any) => {
        const supplierName = curr.fornecedor?.nome || 'Não Identificado';
        if (!acc[supplierName]) {
          acc[supplierName] = { 
            name: supplierName, 
            total: 0, 
            entries: [], 
            limite: curr.fornecedor?.limite_mensal || 0,
            cnpj: curr.fornecedor?.cnpj || ''
          };
        }
        acc[supplierName].total += Number(curr.valor);
        acc[supplierName].entries.push({
          valor: curr.valor,
          os: curr.ordem_servico?.numero_os || null
        });
        return acc;
      }, {});

      return Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
    }
  });

  const { data: trendData } = useQuery({
    queryKey: ['financial-trends'],
    queryFn: async () => {
      const start = startOfMonth(subMonths(new Date(), 6));
      const end = endOfMonth(new Date());

      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select('valor, data_competencia, tipo')
        .gte('data_competencia', start.toISOString().split('T')[0])
        .lte('data_competencia', end.toISOString().split('T')[0]);

      if (error) throw error;

      const months = eachMonthOfInterval({ start, end });
      return months.map(month => {
        const monthStr = format(month, 'yyyy-MM');
        const monthLabel = format(month, 'MMM', { locale: ptBR });
        
        const monthlyData = data?.filter(d => d.data_competencia.startsWith(monthStr)) || [];
        const saidas = monthlyData
          .filter(d => d.tipo === 'saida')
          .reduce((acc, curr) => acc + Number(curr.valor), 0);
        
        return {
          month: monthLabel,
          gastos: saidas
        };
      });
    }
  });

  const exportCSV = () => {
    if (!supplierData || supplierData.length === 0) return;
    
    const headers = ["Fornecedor", "CNPJ", "Gasto Total", "Limite Mensal", "Status"];
    const rows = supplierData.map((s: any) => [
      s.name,
      s.cnpj,
      s.total.toFixed(2),
      s.limite.toFixed(2),
      s.total > s.limite && s.limite > 0 ? "Excedido" : "Dentro do Limite"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fornecedores_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso");
  };

  const exportPDF = () => {
    window.print();
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-8 p-6 md:p-10 pb-10 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight">DASHBOARD <span className="text-primary">FINANCEIRO</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Controle de orçamentos, aprovações e fluxo de caixa.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <FinanceKPICard title="Orçamentos" value="24" subtext="vs mês anterior" icon={FileText} trend="up" trendValue="+15%" />
        <FinanceKPICard title="Aprovações" value="18" subtext="SLA de 75%" icon={CheckCircle2} trend="up" trendValue="+5%" />
        <FinanceKPICard title="Faturamento" value="R$ 840k" subtext="Meta mensal" icon={TrendingUp} trend="down" trendValue="-2%" />
        <FinanceKPICard title="Inadimplência" value="R$ 12k" subtext="Risco monitorado" icon={AlertTriangle} trend="up" trendValue="+0.5%" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 print:hidden">
        <Card className="lg:col-span-2 border-border shadow-md">
          <CardHeader className="bg-muted/10 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Fluxo de Recebimentos</CardTitle>
                <CardDescription>Principais entradas previstas para esta semana.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary text-xs font-bold uppercase tracking-wider">Ver Todos</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[
                { cliente: "Indústria Metalúrgica SA", valor: "R$ 45.000,00", data: "18/08", status: "Confirmado" },
                { cliente: "Agrícola Vale Verde", valor: "R$ 22.400,00", data: "20/08", status: "Pendente" },
                { cliente: "Transportes Rodoviários", valor: "R$ 15.800,00", data: "21/08", status: "Confirmado" },
                { cliente: "Mineradora Serra Azul", valor: "R$ 68.900,00", data: "22/08", status: "Atrasado" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.cliente}</p>
                      <p className="text-xs text-muted-foreground font-medium">Data prevista: {item.data}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{item.valor}</p>
                    <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${
                      item.status === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      item.status === 'Atrasado' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-md">
          <CardHeader className="bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base font-bold">Metas do Mês</CardTitle>
            <CardDescription>Acompanhamento de performance.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-muted-foreground">Faturamento</span>
                <span className="text-foreground">84%</span>
              </div>
              <Progress value={84} className="h-2 bg-slate-100" />
              <p className="text-[10px] text-muted-foreground font-medium">Faltam R$ 160k para atingir a meta.</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-muted-foreground">Conversão de Orçamentos</span>
                <span className="text-foreground">62%</span>
              </div>
              <Progress value={62} className="h-2 bg-slate-100" />
              <p className="text-[10px] text-muted-foreground font-medium">Meta interna de 70%.</p>
            </div>

            <div className="pt-4 border-t border-border/50">
               <Button className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs h-11">
                <Wallet className="mr-2 h-4 w-4" />
                Fechar Caixa do Dia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border-border shadow-md print:shadow-none print:border-none">
          <CardHeader className="bg-muted/10 border-b border-border/50 print:bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Controle de Fornecedores do Mês
                </CardTitle>
                <CardDescription className="print:text-black">
                  Custos acumulados em {months[parseInt(selectedMonth)]} de {selectedYear}.
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[120px] h-8 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar className="mr-2 h-3 w-3 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()} className="text-[10px] uppercase font-bold">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px] h-8 text-[10px] font-bold uppercase tracking-wider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2024", "2025", "2026"].map(y => (
                      <SelectItem key={y} value={y} className="text-[10px] uppercase font-bold">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1 ml-2">
                  <Button variant="outline" size="sm" onClick={exportCSV} title="Exportar CSV" className="h-8 w-8 p-0">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPDF} title="Exportar PDF" className="h-8 w-8 p-0">
                    <FileIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : supplierData && supplierData.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
                {supplierData.map((item: any, idx: number) => {
                  const isExceeded = item.limite > 0 && item.total > item.limite;
                  
                  return (
                    <div key={idx} className={`flex flex-col p-4 rounded-xl border transition-all shadow-sm group print:shadow-none ${
                      isExceeded 
                        ? 'border-red-500/50 bg-red-50/30' 
                        : 'border-border bg-slate-50/50 hover:bg-white'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-sm border transition-colors ${
                          isExceeded ? 'bg-red-100 border-red-200' : 'bg-white border-border group-hover:border-primary/30'
                        }`}>
                          <Truck className={`h-5 w-5 transition-colors ${
                            isExceeded ? 'text-red-500' : 'text-slate-400 group-hover:text-primary'
                          }`} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gasto Total</p>
                          <p className={`text-lg font-black ${isExceeded ? 'text-red-600' : 'text-foreground'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                          </p>
                          {isExceeded && (
                            <div className="flex items-center gap-1 justify-end text-[9px] text-red-500 font-bold uppercase mt-0.5 animate-pulse">
                              <AlertCircle className="h-3 w-3" />
                              Limite Excedido
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-bold text-foreground mb-3 truncate">{item.name}</h4>
                      
                      {item.limite > 0 && (
                        <div className="mb-4 space-y-1">
                          <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                            <span className="text-muted-foreground">Uso do Limite</span>
                            <span className={isExceeded ? 'text-red-600' : 'text-slate-600'}>
                              {Math.round((item.total / item.limite) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={Math.min((item.total / item.limite) * 100, 100)} 
                            className={`h-1.5 ${isExceeded ? 'bg-red-100' : 'bg-slate-200'}`} 
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2 mt-auto">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Detalhes do Mês</p>
                        {item.entries.slice(0, 3).map((entry: any, eIdx: number) => (
                          <div key={eIdx} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                            <span className="text-[10px] font-medium text-slate-600">
                              {entry.os ? `OS #${entry.os}` : 'Lançamento Direto'}
                            </span>
                            <span className="text-[10px] font-bold text-foreground">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum custo registrado para fornecedores neste período.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border-border shadow-md">
          <CardHeader className="bg-muted/10 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Tendência de Gastos (Últimos 6 Meses)
                </CardTitle>
                <CardDescription>Evolução mensal dos custos com fornecedores e OS.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ChartContainer config={{
                gastos: {
                  label: "Gastos (R$)",
                  color: "hsl(var(--primary))"
                }
              }}>
                <AreaChart data={trendData || []}>
                  <defs>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-gastos)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-gastos)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(value) => `R$ ${value/1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Area 
                    type="monotone" 
                    dataKey="gastos" 
                    stroke="var(--color-gastos)" 
                    fillOpacity={1} 
                    fill="url(#colorGastos)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
