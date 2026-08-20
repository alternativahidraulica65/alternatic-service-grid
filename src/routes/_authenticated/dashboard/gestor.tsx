import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
  Clock,
  CheckCircle2
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard/gestor")({
  component: DashboardGestor,
});

function KanbanCard({ os }: any) {
  return (
    <div className="p-3 rounded-lg bg-white border border-border hover:border-primary/50 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{os.numero_os}</span>
        <span className="text-[10px] text-muted-foreground">{os.data}</span>
      </div>
      <p className="text-xs font-medium text-foreground mb-3">{os.descricao}</p>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-[9px]">{os.operador}</Badge>
        <div className="flex -space-x-1.5">
           <div className="h-5 w-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px]">AM</div>
        </div>
      </div>
    </div>
  );
}

function DashboardGestor() {
  const router = useRouter();
  
  const { data: osStats } = useQuery({
    queryKey: ['dashboard_gestor_stats'],
    queryFn: async () => {
      const [os, users, vendors] = await Promise.all([
        supabase.from('ordens_servico').select('status, tecnico_id'),
        supabase.from('usuarios').select('id'),
        supabase.from('vendedores').select('id')
      ]);

      if (os.error) throw os.error;
      
      return {
        naFila: os.data.filter(item => item.status === 'aberta').length,
        atrasadas: os.data.filter(item => item.status === 'atrasada').length,
        tecnicos: users.data?.length || 0,
        vendedores: vendors.data?.length || 0,
        parados: os.data.filter(item => item.status === 'orcamento_pendente').length
      };
    }
  });


  const { data: kanbanData } = useQuery({
    queryKey: ['dashboard_gestor_kanban'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('numero_os, data_abertura, descricao, status')
        .limit(20);
      if (error) throw error;
      
      const columns = [
        { id: 'aberta', title: 'Triagem' },
        { id: 'desmontagem', title: 'Desmontagem' },
        { id: 'usinagem', title: 'Torneiro' },
        { id: 'montagem', title: 'Montagem' },
        { id: 'teste', title: 'Teste' },
        { id: 'pronto', title: 'Pronto' },
      ];

      return columns.map(col => ({
        title: col.title,
        items: data
          .filter(os => os.status === col.id)
          .map(os => ({
            numero_os: os.numero_os,
            data: os.data_abertura ? format(new Date(os.data_abertura), 'dd/MM') : '--/--',
            descricao: os.descricao,
            operador: 'Técnico'
          }))
      }));
    }
  });

  const stats = osStats || { naFila: 0, atrasadas: 0, tecnicos: 0, vendedores: 0, parados: 0 };
  const kanban = kanbanData || [];

  return (
    <div className="space-y-8 p-6 md:p-10 pb-10">
      <div>
        <h2 className="font-display text-3xl font-black text-foreground tracking-tight">DASHBOARD <span className="text-primary">GESTÃO</span></h2>
        <p className="text-sm text-muted-foreground font-medium">Controle de fluxo operacional e gargalos da oficina.</p>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card 
          className="col-span-2 lg:col-span-1 bg-primary text-primary-foreground border-none shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.navigate({ to: '/os' })}
        >
          <CardHeader className="p-4"><CardTitle className="text-2xl font-black">{stats.naFila.toString().padStart(2, '0')}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">OS na Fila</CardContent>
        </Card>
        <Card 
          className="col-span-2 lg:col-span-1 bg-red-500 text-white border-none shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.navigate({ to: '/os' })}
        >
          <CardHeader className="p-4"><CardTitle className="text-2xl font-black">{stats.atrasadas.toString().padStart(2, '0')}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">OS Atrasadas</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 bg-slate-900 text-white border-none shadow-lg">
          <CardHeader className="p-4"><CardTitle className="text-2xl font-black">{stats.parados.toString().padStart(2, '0')}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">Equip. Parados</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4"><CardTitle className="text-lg font-black">{stats.tecnicos.toString().padStart(2, '0')}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Técnicos</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4"><CardTitle className="text-lg font-black">{stats.vendedores.toString().padStart(2, '0')}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Vendedores</CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4"><CardTitle className="text-lg font-black">{(stats.naFila + stats.atrasadas).toString().padStart(2, '0')}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Total Ativo</CardContent>
        </Card>

      </div>

      {/* Kanban de Status */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kanban.map((column) => (
          <div 
            key={column.title} 
            className="flex flex-col gap-2 cursor-pointer group"
            onClick={() => router.navigate({ to: '/kanban' })}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              {column.title}
              <Badge variant="secondary" className="text-[9px]">{column.items.length}</Badge>
            </div>
            <div className="flex-1 rounded-xl bg-slate-100/50 p-2 border border-slate-200 space-y-2">
              {column.items.map((os, i) => <KanbanCard key={i} os={os} />)}
            </div>
          </div>
        ))}
      </div>

      {/* Alertas Operacionais Dinâmicos */}
      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/10 border-b border-border/50">
           <CardTitle className="text-base font-bold">Alertas Operacionais</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {stats.atrasadas > 0 ? (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50/50 flex gap-3 cursor-pointer hover:bg-red-50 transition-colors" onClick={() => router.navigate({ to: '/os' })}>
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-800">{stats.atrasadas} OS Atrasadas!</p>
                  <p className="text-xs text-red-600">Prazos excedidos. Requer intervenção imediata no fluxo produtivo.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Fluxo Normal</p>
                  <p className="text-xs text-emerald-600">Nenhuma ordem de serviço com atraso crítico detectado.</p>
                </div>
              </div>
            )}
            
            {stats.parados > 0 && (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex gap-3 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => router.navigate({ to: '/os' })}>
                <Package className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">{stats.parados} OS Aguardando Orçamento</p>
                  <p className="text-xs text-amber-600">Equipamentos parados aguardando definição comercial ou técnica.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
