import { createFileRoute } from "@tanstack/react-router";
import { 
  BarChart3, 
  Settings, 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Users,
  Calendar,
  Filter,
  RefreshCcw,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ClientOnly } from "@/components/ClientOnly";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function RelatoriosPage() {
  const [loading, setLoading] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['relatorios-stats'],
    queryFn: async () => {
      const [faturamento, produtividade, status] = await Promise.all([
        supabase.rpc('get_faturamento_mensal' as any),
        supabase.rpc('get_produtividade_tecnicos' as any),
        supabase.rpc('get_distribuicao_status_os' as any)
      ]);
      return {
        faturamento: faturamento.data || [],
        produtividade: produtividade.data || [],
        status: status.data || []
      };
    }
  });

  const dataFaturamento = stats?.faturamento || [
    { mes: 'Sem Dados', valor: 0 }
  ];

  const dataProdutividade = stats?.produtividade || [];

  const statusOS = stats?.status || [];

  const faturamentoTotal = dataFaturamento.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0);
  const ticketMedio = faturamentoTotal / (statusOS.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) || 1);


  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">CENTRAL DE <span className="text-primary">INTELIGÊNCIA</span></h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Relatórios gerenciais, KPIs e análises produtivas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="h-10 w-40 border-border bg-white font-bold text-[10px] uppercase tracking-widest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
            <Download className="mr-2 h-4 w-4 text-primary" />
            PDF Completo
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-border shadow-sm border-t-4 border-t-primary">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Faturamento Bruto</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-foreground">
                {faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </p>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +100%
              </span>

            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-2">vs. período anterior</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-t-4 border-t-blue-500">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ticket Médio OS</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-foreground">
                {ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </p>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Estável
              </span>

            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-2">Média por ordem de serviço</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-t-4 border-t-emerald-500">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Taxa de Conversão</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-foreground">78%</p>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +5%
              </span>
            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-2">Orçamentos aprovados</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-t-4 border-t-amber-500">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Lead Time Médio</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-foreground">5.2d</p>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> -1.2d
              </span>
            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-2">Do recebimento à entrega</p>
          </CardContent>
        </Card>
      </div>

      <ClientOnly>
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest">Evolução de Faturamento</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Valores brutos mensais (Semestre atual)</CardDescription>
                </div>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataFaturamento}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="mes" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                    tickFormatter={(value) => `R$ ${value/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="valor" fill="#FFD700" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest">Produtividade por Equipe</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">OS Finalizadas vs. Média de Avaliação</CardDescription>
                </div>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataProdutividade} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="tecnico" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="os" fill="#1e293b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest">Distribuição de Status</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Carga de trabalho atual na oficina</CardDescription>
                </div>
                <Target className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusOS}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusOS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                 {statusOS.map((item) => (
                   <div key={item.name} className="flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                     <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.name} ({item.value})</span>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md bg-slate-900 text-white overflow-hidden">
            <CardHeader className="bg-slate-800/50 border-b border-white/5">
              <CardTitle className="text-base font-bold uppercase tracking-widest">Alertas de Gargalo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[
                { label: "Setor de Usinagem", info: "3 OS aguardando há mais de 48h", status: "Crítico", color: "bg-red-500" },
                { label: "Compras / Vedações", info: "Atraso na entrega de kit (Fornecedor X)", status: "Atenção", color: "bg-amber-500" },
                { label: "Aprovação Financeira", info: "Cliente Ind. Metalúrgica bloqueado", status: "Alerta", color: "bg-amber-500" },
              ].map((alerta, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${alerta.color}`} />
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{alerta.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{alerta.info}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-white text-[8px] font-black uppercase tracking-widest">{alerta.status}</Badge>
                </div>
              ))}
              <Button className="w-full mt-2 h-10 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest">Gerar Plano de Ação</Button>
            </CardContent>
          </Card>
        </div>
      </ClientOnly>
    </div>
  );
}
