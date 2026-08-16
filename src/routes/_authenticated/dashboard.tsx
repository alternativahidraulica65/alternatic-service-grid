import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  User as UserIcon
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

// Mock data for initial visualization
const REVENUE_BY_CNPJ = [
  { name: "Alternativa Matriz", value: 125000 },
  { name: "Alternativa Filial Sul", value: 85000 },
  { name: "Alternativa Equipamentos", value: 45000 },
];

const COLORS = ["#FFD700", "#A9A9A9", "#708090"];

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
  const { user, profile, roles, isAdmin } = Route.useRouteContext();
  
  const mainRole = isAdmin ? "Diretor" : roles[0] || "Operador";
  const formattedRole = mainRole.charAt(0).toUpperCase() + mainRole.slice(1);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu do sistema");
    await router.navigate({ to: "/", replace: true });
  }

  // View: Diretor / Financeiro
  if (isAdmin || roles.includes("financeiro")) {
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
              <span>Atualizado agora</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard 
              title="Faturamento (Mês)" 
              value="R$ 255.000,00" 
              subtext="vs. mês anterior" 
              trend="12%" 
              icon={DollarSign} 
            />
            <KPICard 
              title="OS Ativas" 
              value="42" 
              subtext="Em produção" 
              icon={ClipboardList} 
            />
            <KPICard 
              title="Orçamentos Pendentes" 
              value="18" 
              subtext="Aguardando aprovação" 
              icon={AlertTriangle} 
            />
            <KPICard 
              title="Margem Global" 
              value="34.5%" 
              subtext="Média atual" 
              trend="2.1%" 
              icon={TrendingUp} 
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Faturamento por CNPJ (Empresa Emissora)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REVENUE_BY_CNPJ} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                      <Tooltip 
                        cursor={{ fill: "transparent" }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(val: number) => [`R$ ${val.toLocaleString("pt-BR")}`, "Faturamento"]}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {REVENUE_BY_CNPJ.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start btn-industrial" variant="default">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar Orçamentos
                </Button>
                <Button className="w-full justify-start border-input" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Relatório Financeiro
                </Button>
                <Button className="w-full justify-start border-input" variant="outline">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Auditoria de Custos
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // View: Gestor
  if (roles.includes("gestor")) {
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
              <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-lg">
                Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="container-industrial py-8 space-y-8">
          <h2 className="font-display text-2xl font-bold text-foreground">Gestão de Produção</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KPICard title="Equipamentos na Oficina" value="28" subtext="Unidades totais" icon={Factory} />
            <KPICard title="Aguardando Custos" value="7" subtext="OS paradas" icon={DollarSign} />
            <KPICard title="Lead Time Médio" value="4.2 dias" subtext="Mês atual" icon={Clock} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Visão da Oficina</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
                Módulo de controle de equipamentos em breve
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
          <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-lg">
            Sair
          </Button>
        </div>
      </header>
      <main className="container-industrial py-8 space-y-8">
        <div className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground">Minha Fila de Trabalho</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ordens de Serviço Atribuídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                <div>
                  <p className="text-sm font-bold">OS #2024-001</p>
                  <p className="text-xs text-muted-foreground">Cilindro Hidráulico CAT 320D</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">Em Execução</span>
                  <Button size="sm" variant="outline" className="h-8">Detalhes</Button>
                </div>
              </div>
              {/* Exemplo de fila vazia/futura */}
              <p className="text-center text-sm text-muted-foreground py-10">
                Você não tem outras ordens de serviço pendentes no momento.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
