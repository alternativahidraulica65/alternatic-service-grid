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
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="font-display text-3xl font-black text-foreground tracking-tight">DASHBOARD <span className="text-primary">FINANCEIRO</span></h2>
        <p className="text-sm text-muted-foreground font-medium">Controle de orçamentos, aprovações e fluxo de caixa.</p>
      </div>

      {/* KPIs Financeiros Detalhados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKPICard 
          title="Orçamentos" 
          value="24" 
          subtext="vs mês anterior" 
          icon={FileText} 
          trend="up"
          trendValue="+15%"
        />
        <FinanceKPICard 
          title="Aprovações" 
          value="18" 
          subtext="SLA de 75%" 
          icon={CheckCircle2} 
          trend="up"
          trendValue="+5%"
        />
        <FinanceKPICard 
          title="Faturamento" 
          value="R$ 840k" 
          subtext="Meta mensal" 
          icon={TrendingUp} 
          trend="down"
          trendValue="-2%"
        />
        <FinanceKPICard 
          title="Inadimplência" 
          value="R$ 12k" 
          subtext="Risco monitorado" 
          icon={AlertTriangle} 
          trend="up"
          trendValue="+0.5%"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximos Recebimentos */}
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

        {/* Resumo de Metas Financeiras */}
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

            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
               <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
               <p className="text-[10px] text-red-700 font-bold leading-tight">
                Existem 4 orçamentos pendentes de aprovação há mais de 48h.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
