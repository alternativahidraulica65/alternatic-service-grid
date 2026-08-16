import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  LogOut, 
  Droplets, 
  TrendingUp, 
  ClipboardList, 
  Clock, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  LayoutDashboard,
  Factory,
  User as UserIcon,
  Wrench,
  Plus,
  Eye,
  ShieldCheck,
  Search,
  Users,
  Box,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Alternativa Hidráulica" },
      { name: "description", content: "Dashboard operacional do ERP Alternativa Hidráulica." },
      { property: "og:title", content: "Dashboard — Alternativa Hidráulica" },
      { property: "og:description", content: "Dashboard operacional do ERP Alternativa Hidráulica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function KPICard({ title, value, subtext, icon: Icon, trend }: any) {
  return (
    <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="mt-1 flex items-center text-xs text-muted-foreground">
          {trend && (
            <span className="mr-1 flex items-center text-emerald-500">
              <TrendingUp className="mr-0.5 h-3 w-3" />
              {trend}
            </span>
          )}
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile, roles, isDiretor, isFinanceiro, isGestor, isOperador, isTerceirizado } = Route.useRouteContext();
  
  // Local state for view simulation (RBAC override for admins)
  const [activeView, setActiveView] = useState<string | null>(null);
  
  useEffect(() => {
    if (isDiretor && !activeView) {
      setActiveView("diretor");
    } else if (!isDiretor) {
      // Prioridade de visão se tiver múltiplas roles
      if (isFinanceiro) setActiveView("financeiro");
      else if (isGestor) setActiveView("gestor");
      else if (isOperador) setActiveView("operador");
      else if (isTerceirizado) setActiveView("terceirizado");
      else setActiveView("operador");
    }
  }, [isDiretor, isFinanceiro, isGestor, isOperador, isTerceirizado]);

  const formattedRole = activeView ? activeView.charAt(0).toUpperCase() + activeView.slice(1) : "Acessando...";
  const currentView = activeView;

  // Fetch real data from Supabase
  const { data: companies } = useSuspenseQuery({
    queryKey: ['empresas_emissoras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas_emissoras').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: orders } = useSuspenseQuery({
    queryKey: ['ordens_servico'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordens_servico').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Calculate KPIs based on real data
  const activeOrdersCount = orders?.filter(o => o.status === 'aberta' || o.status === 'em_andamento').length || 0;
  const totalRevenue = isFinanceiro || isDiretor ? (orders?.reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0) || 0) : 0;
  const pendingQuotes = orders?.filter(o => o.status === 'orcamento_pendente').length || 0;
  const avgMargin = isDiretor ? (orders?.length ? (orders.reduce((acc, curr) => acc + (Number(curr.margem_lucro) || 0), 0) / orders.length) : 0) : 0;

  // Prepare chart data
  const revenueByCnpj = companies?.map(company => {
    const revenue = orders?.filter(o => o.empresa_id === company.id)
      .reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0) || 0;
    return {
      name: company.nome,
      value: revenue,
      color: company.cor_identificacao
    };
  }) || [];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu do sistema");
    await router.navigate({ to: "/", replace: true });
  }

  // Render View Switcher for Admins
  const ViewSwitcher = () => {
    if (!isDiretor) return null;
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
          <DropdownMenuItem onClick={() => setActiveView("diretor")} className={activeView === "diretor" ? "bg-primary/10 font-bold" : ""}>
            Diretor / Estratégico
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("financeiro")} className={activeView === "financeiro" ? "bg-primary/10 font-bold" : ""}>
            Financeiro / Faturamento
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("gestor")} className={activeView === "gestor" ? "bg-primary/10 font-bold" : ""}>
            Gestor / Produção
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("operador")} className={activeView === "operador" ? "bg-primary/10 font-bold" : ""}>
            Operador / Bancada
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // View: Diretor / Financeiro
  if (currentView === "diretor" || currentView === "financeiro") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm backdrop-blur-sm">
          <div className="container-industrial flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Droplets className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display text-lg font-semibold text-foreground leading-tight">
                  Alternativa Hidráulica
                </h1>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Gestão Estratégica
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-foreground">{profile?.nome || user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{formattedRole}</p>
              </div>
              <ViewSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="rounded-lg border-input hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="container-industrial py-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-foreground">Visão Executiva</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Dados reais do sistema</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(isDiretor || isFinanceiro) && (
              <KPICard 
                title="Faturamento Total" 
                value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
                subtext="Total acumulado" 
                icon={DollarSign} 
              />
            )}
            <KPICard 
              title="OS Ativas" 
              value={activeOrdersCount.toString()} 
              subtext="Em produção" 
              icon={ClipboardList} 
            />
            <KPICard 
              title="Orçamentos Pendentes" 
              value={pendingQuotes.toString()} 
              subtext="Aguardando aprovação" 
              icon={AlertTriangle} 
            />
            {isDiretor && (
              <KPICard 
                title="Margem Média" 
                value={`${avgMargin.toFixed(1)}%`} 
                subtext="Média global" 
                trend={avgMargin > 30 ? "Acima da meta" : ""} 
                icon={TrendingUp} 
              />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Chart */}
            {isDiretor && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Faturamento por Empresa Emissora</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByCnpj} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                        <Tooltip 
                          cursor={{ fill: "transparent" }}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(val: any) => [`R$ ${Number(val).toLocaleString("pt-BR")}`, "Faturamento"]}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {revenueByCnpj.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || "#FFD700"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start btn-industrial" 
                  variant="default"
                  onClick={() => router.navigate({ to: "/ordens-servico/nova" as any })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Ordem de Serviço
                </Button>
                <Button 
                  className="w-full justify-start border-input" 
                  variant="outline"
                  onClick={() => router.navigate({ to: "/orcamento" })}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Orçamentação e Custos
                </Button>
                <Button 
                  className="w-full justify-start border-input" 
                  variant="outline"
                  onClick={() => router.navigate({ to: "/orcamento/precificacao" as any })}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Precificação e Aprovação
                </Button>

                {isFinanceiro && (
                  <Button 
                    className="w-full justify-start border-input" 
                    variant="outline"
                    onClick={() => router.navigate({ to: "/orcamento/pdf" as any })}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Gerador de Orçamentos (PDF)
                  </Button>
                )}
                {isGestor && (
                  <Button 
                    className="w-full justify-start border-input" 
                    variant="outline"
                    onClick={() => router.navigate({ to: "/engenharia/materiais" as any })}
                  >
                    <Box className="mr-2 h-4 w-4" />
                    Matéria-Prima Inteligente
                  </Button>
                )}
                <Button 
                  className="w-full justify-start border-input" 
                  variant="outline"
                  onClick={() => router.navigate({ to: "/historico" as any })}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Busca e Histórico Global
                </Button>
                {isDiretor && (
                  <Button 
                    className="w-full justify-start border-input" 
                    variant="outline"
                    onClick={() => router.navigate({ to: "/admin/usuarios" as any })}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gestão de Usuários
                  </Button>
                )}

                <Button 
                  className="w-full justify-start border-input" 
                  variant="outline"
                  onClick={() => router.navigate({ to: "/kanban" })}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Kanban de Produção
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // View: Gestor
  if (currentView === "gestor") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card shadow-sm">
          <div className="container-industrial flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Factory className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-lg font-semibold text-foreground">Alternativa Hidráulica</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-foreground">{profile?.nome || user.email}</p>
              <ViewSwitcher />
              <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-lg">
                Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="container-industrial py-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-foreground">Gestão de Produção</h2>
            <Button 
              className="btn-industrial" 
              onClick={() => router.navigate({ to: "/ordens-servico/nova" as any })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova OS / Triagem
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KPICard title="Ordens Ativas" value={activeOrdersCount.toString()} subtext="Unidades totais" icon={Factory} />
            <KPICard title="Aguardando Custos" value={pendingQuotes.toString()} subtext="OS paradas" icon={DollarSign} />
            <KPICard title="Lead Time Médio" value="4.2 dias" subtext="Estimado do sistema" icon={Clock} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Visão da Oficina</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders?.filter(o => o.status === 'aberta' || o.status === 'em_andamento').map(order => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
                    <div>
                      <p className="text-sm font-bold">{order.numero_os}</p>
                      <p className="text-xs text-muted-foreground">{order.cliente}</p>
                    </div>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">{order.status}</span>
                  </div>
                ))}
                {activeOrdersCount === 0 && (
                  <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
                    Nenhuma ordem de serviço ativa no momento.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // View: Operador (Default)
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-lg font-semibold text-foreground">Alternativa Hidráulica</h1>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher />
            <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-lg">
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="container-industrial py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground">Minha Fila de Trabalho</h2>
          </div>
          {isGestor && (
            <Button 
              className="btn-industrial" 
              onClick={() => router.navigate({ to: "/ordens-servico/nova" as any })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Triagem
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ordens de Serviço Atribuídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders?.map(order => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                  <div>
                    <p className="text-sm font-bold">{order.numero_os}</p>
                    <p className="text-xs text-muted-foreground">{order.cliente}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">{order.status}</span>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => router.navigate({ to: "/kanban" })}>Detalhes</Button>
                  </div>
                </div>
              ))}
              {(!orders || orders.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  Você não tem outras ordens de serviço pendentes no momento.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
