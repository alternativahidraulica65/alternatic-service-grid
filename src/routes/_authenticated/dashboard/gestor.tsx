import { createFileRoute } from "@tanstack/react-router";
import { 
  Factory, 
  Settings, 
  Wrench, 
  ClipboardCheck, 
  UserCheck, 
  Users, 
  Package, 
  AlertTriangle,
  PlayCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/gestor")({
  component: DashboardGestor,
});

function KanbanCard({ os }: any) {
  return (
    <div className="p-3 rounded-lg bg-white border border-border hover:border-primary/50 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{os.numero_os}</span>
        <span className="text-[10px] text-muted-foreground">{os.data_abertura ? new Date(os.data_abertura).toLocaleDateString() : 'N/A'}</span>
      </div>
      <p className="text-xs font-medium text-foreground mb-3 uppercase">{os.descricao || "Sem descrição"}</p>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter">{os.cliente || "S/ Cliente"}</Badge>
        <div className="flex -space-x-1.5">
           <div className="h-5 w-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-bold">
             {os.tecnico_id ? "T" : "?"}
           </div>
        </div>
      </div>
    </div>
  );
}

function DashboardGestor() {
  const { podeVerValoresFinanceiros } = useUserRole();
  const { data: ordens = [], isLoading, error } = useQuery({
    queryKey: ['dashboard_gestor_os'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: counters } = useQuery({
    queryKey: ['dashboard_gestor_counters'],
    queryFn: async () => {
      const [
        { count: operadores },
        { count: materiais }
      ] = await Promise.all([
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('cargo', 'operador'),
        supabase.from('materiais').select('*', { count: 'exact', head: true })
      ]);
      return { operadores: operadores || 0, materiais: materiais || 0 };
    }
  });

  const stats = useMemo(() => {
    const naFila = ordens.filter(o => o.status === 'aberta').length;
    const atrasadas = ordens.filter(o => o.status === 'atrasada').length;
    
    const columns = [
      { title: "Triagem", status: "aberta" },
      { title: "Vistoria", status: "vistoria" },
      { title: "Orçamento", status: "orcamento_pendente" },
      { title: "Usinagem", status: "usinagem" },
      { title: "Montagem", status: "montagem" },
      { title: "Pronto", status: "pronto" },
    ];

    return { naFila, atrasadas, columns };
  }, [ordens]);

  if (error) {
    return (
      <div className="p-10 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground">Erro ao carregar dashboard</h3>
        <p className="text-sm text-muted-foreground">Não foi possível conectar ao banco de dados.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8 p-6 md:p-10 pb-10">
      <div>
        <h2 className="font-display text-3xl font-black text-foreground tracking-tight">DASHBOARD <span className="text-primary">GESTÃO</span></h2>
        <p className="text-sm text-muted-foreground font-medium">Controle de fluxo operacional e gargalos da oficina.</p>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="col-span-2 lg:col-span-1 bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="p-4">
            <CardTitle className="text-2xl font-black">
              {isLoading ? <Skeleton className="h-8 w-12 bg-white/20" /> : stats.naFila.toString().padStart(2, '0')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">OS na Fila</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 bg-red-500 text-white border-none shadow-lg">
          <CardHeader className="p-4">
            <CardTitle className="text-2xl font-black">
              {isLoading ? <Skeleton className="h-8 w-12 bg-white/20" /> : stats.atrasadas.toString().padStart(2, '0')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">OS Atrasadas</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 bg-slate-900 text-white border-none shadow-lg">
          <CardHeader className="p-4">
            <CardTitle className="text-2xl font-black">
              {isLoading ? <Skeleton className="h-8 w-12 bg-white/20" /> : "02"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">Equip. Parados</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-black">
              {counters?.operadores.toString().padStart(2, '0') || "00"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Operadores</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4"><CardTitle className="text-lg font-black">03</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Terceiros</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-black">
              {counters?.materiais.toString().padStart(2, '0') || "00"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Materiais</CardContent>
        </Card>
      </div>

      {/* Kanban de Status */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 overflow-x-auto pb-4">
        {stats.columns.map((column) => {
          const items = ordens.filter(o => o.status === column.status);
          return (
            <div key={column.title} className="flex flex-col gap-2 min-w-[180px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                {column.title}
                <Badge variant="secondary" className="text-[9px]">{items.length}</Badge>
              </div>
              <div className="flex-1 rounded-xl bg-slate-100/50 p-2 border border-slate-200 space-y-2 min-h-[200px]">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  items.map((os, i) => <KanbanCard key={os.id || i} os={os} />)
                )}
                {!isLoading && items.length === 0 && (
                  <div className="h-20 flex items-center justify-center opacity-20">
                    <Clock className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de Tarefas / Pendências */}
      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/10 border-b border-border/50">
           <CardTitle className="text-base font-bold">Alertas Operacionais</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-red-200 bg-red-50/50 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">OS-1020 Atrasada!</p>
                <p className="text-xs text-red-600">Gargalo identificado no Torneiro. Prazo crítico excedido.</p>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex gap-3">
              <Package className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Peça pendente: Kit Vedação</p>
                <p className="text-xs text-amber-600">Fornecedor não confirmou a entrega para hoje.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
