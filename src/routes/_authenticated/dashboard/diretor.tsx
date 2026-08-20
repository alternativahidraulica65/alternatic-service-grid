import { createFileRoute, useRouter } from "@tanstack/react-router";
import { 
  TrendingUp, 
  ClipboardList, 
  Clock, 
  DollarSign,
  AlertTriangle,
  Factory,
  BarChart3,
  Calendar,
  Filter,
  Users,
  Package,
  Receipt
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/ClientOnly";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/diretor")({
  component: DashboardDiretor,
});

function KPICard({ title, value, subtext, icon: Icon, colorClass = "text-primary", onClick }: any) {
  return (
    <Card 
      className={`border-border bg-card shadow-sm overflow-hidden group transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <div className={`rounded-lg bg-slate-100 p-2 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 font-medium">
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}

const mockRevenueData = [
  { name: "Matriz", value: 450000, color: "#FFD700" },
  { name: "Filial Sul", value: 280000, color: "#C0C0C0" },
  { name: "Filial Norte", value: 310000, color: "#808080" },
];

const mockStatusData = [
  { name: "Abertas", value: 12, fill: "#FFD700" },
  { name: "Em Andamento", value: 18, fill: "#60A5FA" },
  { name: "Atrasadas", value: 5, fill: "#EF4444" },
  { name: "Concluídas", value: 25, fill: "#10B981" },
];

function DashboardDiretor() {
  const router = useRouter();
  const { data: dbStats } = useQuery({
    queryKey: ['dashboard_diretor_db_stats'],
    queryFn: async () => {
      const [
        { count: clientesCount }
      ] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true })
      ]);

      return {
        clientesCount: clientesCount || 0
      };
    }
  });

  const { data: ordens = [] } = useQuery({
    queryKey: ['dashboard_diretor_os'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordens_servico').select('*');
      if (error) throw error;
      return data;
    }
  });

  const stats = useMemo(() => {
    const faturamento = ordens.reduce((acc, os) => acc + (os.valor_total || 0), 0);
    const abertas = ordens.filter(os => os.status === 'aberta').length;
    const atrasadas = ordens.filter(os => os.status === 'atrasada').length;
    const concluidas = ordens.filter(os => os.status === 'pronto').length;
    const emAndamento = ordens.length - abertas - atrasadas - concluidas;

    const statusData = [
      { name: "Abertas", value: abertas, fill: "#FFD700" },
      { name: "Andamento", value: emAndamento, fill: "#60A5FA" },
      { name: "Atrasadas", value: atrasadas, fill: "#EF4444" },
      { name: "Concluídas", value: concluidas, fill: "#10B981" },
    ];

    return { faturamento, abertas, atrasadas, statusData };
  }, [ordens]);

  return (
    <div className="space-y-8 p-6 md:p-10 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight">DASHBOARD <span className="text-primary">DIRETOR</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Indicadores estratégicos em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 border-input bg-card shadow-sm">
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            Últimos 30 dias
          </Button>
          <Button variant="outline" size="sm" className="h-9 border-input bg-card shadow-sm">
            <Filter className="mr-2 h-4 w-4 text-primary" />
            Filtros
          </Button>
        </div>
      </div>

      {/* KPIs Financeiros Detalhados (Dinamizados) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Total de Clientes" 
          value={dbStats?.clientesCount?.toString() || "0"} 
          subtext="Base total de clientes" 
          icon={Users} 
          colorClass="text-emerald-500"
          onClick={() => router.navigate({ to: '/clientes' })}
        />
        <KPICard 
          title="OS Abertas" 
          value={stats.abertas.toString()} 
          subtext="Aguardando início" 
          icon={ClipboardList} 
          onClick={() => router.navigate({ to: '/os' })}
        />
        <KPICard 
          title="OS Atrasadas" 
          value={stats.atrasadas.toString()} 
          subtext="Risco de SLA" 
          icon={AlertTriangle} 
          colorClass="text-red-600"
          onClick={() => router.navigate({ to: '/os' })}
        />
        <KPICard 
          title="MTTR Médio" 
          value="4.2 dias" 
          subtext="Tempo Médio de Reparo" 
          icon={Clock} 
        />
        <KPICard 
          title="Produtividade" 
          value="92%" 
          subtext="Eficiência da equipe técnica" 
          icon={Factory} 
        />
      </div>

      <ClientOnly>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de Faturamento */}
          <Card className="border-border shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Faturamento por Unidade</CardTitle>
                  <CardDescription>Distribuição de receita bruta.</CardDescription>
                </div>
                <Badge variant="outline" className="border-primary text-primary bg-primary/5">Real vs Meta</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <Tooltip 
                      cursor={{ fill: "transparent" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontWeight: 600 }}
                      formatter={(val: any) => [`R$ ${Number(val).toLocaleString("pt-BR")}`, "Valor"]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                      {mockRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Status de OS */}
          <Card className="border-border shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div>
                <CardTitle className="text-base font-bold">Distribuição de Status de OS</CardTitle>
                <CardDescription>Visão geral do fluxo produtivo.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex h-[300px] items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 pl-4 text-xs font-bold uppercase tracking-wider">
                  {stats.statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-muted-foreground whitespace-nowrap">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientOnly>
    </div>
  );
}
