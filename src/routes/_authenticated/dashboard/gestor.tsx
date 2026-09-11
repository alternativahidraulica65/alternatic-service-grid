import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BancadasDialog } from "@/components/BancadasDialog";
import { PecasDialog, STATUS_FINALIZADOS } from "@/components/PecasDialog";
import { OsAtrasadasDialog, isOsAtrasada } from "@/components/OsAtrasadasDialog";


export const Route = createFileRoute("/_authenticated/dashboard/gestor")({
  component: DashboardGestor,
});

function KanbanCard({ os, onOpen, onDragStart }: any) {
  const draggingRef = useRef(false);
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        draggingRef.current = true;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(os.id));
        onDragStart?.(os);
      }}
      onDragEnd={() => { setTimeout(() => { draggingRef.current = false; }, 50); }}
      onClick={() => { if (!draggingRef.current) onOpen?.(os); }}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(os); }}
      className="p-3 rounded-lg bg-white border border-border hover:border-primary/50 transition-all shadow-sm cursor-grab active:cursor-grabbing"
    >

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{os.numero_os ?? os.id}</span>
        <span className="text-[10px] text-muted-foreground">{os.criado_em ? new Date(os.criado_em).toLocaleDateString('pt-BR') : 'N/A'}</span>
      </div>
      <p className="text-xs font-medium text-foreground mb-3 uppercase">{os.descricao || "Sem descrição"}</p>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter">
          {os.cliente_id ? `Cliente ${os.cliente_id.substring(0,4)}` : "S/ Cliente"}
        </Badge>
        <div className="flex -space-x-1.5">
           <div className="h-5 w-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-bold">
             {os.operador_atribuido ? "T" : "?"}
           </div>
        </div>
      </div>
    </div>
  );
}

function DashboardGestor() {
  const { podeVerValoresFinanceiros } = useUserRole();
  const [bancadasOpen, setBancadasOpen] = useState(false);
  const [pecasOpen, setPecasOpen] = useState(false);
  const [atrasadasOpen, setAtrasadasOpen] = useState(false);

  const { data: ordens = [], isLoading, error } = useQuery({
    queryKey: ['dashboard_gestor_os'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data || [];
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
        supabase.from('materias_primas').select('*', { count: 'exact', head: true })
      ]);
      return { operadores: operadores || 0, materiais: materiais || 0 };
    }
  });

  const { data: pecasEmBancadas = [] } = useQuery({
    queryKey: ['dashboard_gestor_pecas_bancadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_pecas_rastreio' as any)
        .select('id, nome, os_id, status_peca, bancada_id, criado_em')
        .not('bancada_id', 'is', null)
        .not('status_peca', 'in', '(concluida,finalizada,entregue,cancelada)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });


  const { data: pecasPendentes = [] } = useQuery({
    queryKey: ['dashboard_gestor_pecas_pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_pecas_rastreio' as any)
        .select('id, nome, os_id, status_peca, criado_em')
        .or('status_peca.is.null,status_peca.eq.Pendente de Destinação')
        .order('criado_em', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const alertas = useMemo(() => {
    const agora = Date.now();
    const finalizados = ['entregue', 'encerrada', 'faturada', 'cancelada'];

    const atrasadas = (ordens as any[])
      .filter((o) => {
        if (finalizados.includes(String(o.status))) return false;
        const prazo = o.prazo_orcamento ?? o.data_previsao_conclusao;
        return prazo ? new Date(prazo).getTime() < agora : false;
      })
      .map((o) => {
        const prazo = o.prazo_orcamento ?? o.data_previsao_conclusao;
        const dias = Math.max(1, Math.floor((agora - new Date(prazo).getTime()) / 86400000));
        return {
          id: `os-${o.id}`,
          tipo: 'atraso' as const,
          titulo: `${o.numero_os ?? 'OS'} atrasada!`,
          descricao: `Prazo vencido há ${dias} dia(s). Status atual: ${String(o.status ?? '—').toUpperCase()}.`,
          osId: o.id,
        };
      });

    const pecas = (pecasPendentes as any[]).map((p) => ({
      id: `peca-${p.id}`,
      tipo: 'peca' as const,
      titulo: `Peça sem destinação: ${p.nome ?? 'Peça'}`,
      descricao: 'Defina manutenção, compra, usinagem, terceiros ou armazenagem.',
      osId: p.os_id,
    }));

    return [...atrasadas, ...pecas].slice(0, 6);
  }, [ordens, pecasPendentes]);

  const { data: todasPecas = [] } = useQuery({
    queryKey: ['dashboard_gestor_pecas_todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_pecas_rastreio' as any)
        .select('id, os_id');
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalPecasAbertas = useMemo(() => {
    const abertas = new Set(
      (ordens as any[])
        .filter((o) => !STATUS_FINALIZADOS.includes(String(o.status)))
        .map((o) => String(o.id)),
    );
    return (todasPecas as any[]).filter((p: any) => abertas.has(String(p.os_id))).length;
  }, [todasPecas, ordens]);



  const stats = useMemo(() => {
    const naFila = ordens.filter(o => o.status === 'aberta').length;
    const atrasadas = (ordens as any[]).filter((o) => isOsAtrasada(o)).length;
    
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="col-span-2 lg:col-span-1 bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="p-4">
            <CardTitle className="text-2xl font-black">
              {isLoading ? <Skeleton className="h-8 w-12 bg-white/20" /> : stats.naFila.toString().padStart(2, '0')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase">Total em Aberto</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setAtrasadasOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAtrasadasOpen(true); }}
          className="col-span-2 lg:col-span-1 bg-red-500 text-white border-none shadow-lg cursor-pointer hover:bg-red-600 transition-colors"
        >
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
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setBancadasOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setBancadasOpen(true); }}
          className="col-span-2 lg:col-span-1 border-border shadow-sm cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
        >
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-black">
              {pecasEmBancadas.length.toString().padStart(2, '0')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">
            Operadores / Bancadas
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1 border-border shadow-sm">
          <CardHeader className="p-4"><CardTitle className="text-lg font-black">03</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Terceiros</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setPecasOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPecasOpen(true); }}
          className="col-span-2 lg:col-span-1 border-border shadow-sm cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
        >
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-black">
              {totalPecasAbertas.toString().padStart(2, '0')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[10px] font-bold uppercase text-muted-foreground">Peças</CardContent>
        </Card>
      </div>

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

      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/10 border-b border-border/50">
           <CardTitle className="text-base font-bold">Alertas Operacionais</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {alertas.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Nenhum alerta operacional no momento
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {alertas.map((a) => (
                <Link
                  key={a.id}
                  to="/os/$id"
                  params={{ id: String(a.osId) }}
                  className={`p-4 rounded-lg border flex gap-3 transition-colors ${a.tipo === 'atraso' ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'}`}
                >
                  {a.tipo === 'atraso' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                  ) : (
                    <Package className="h-5 w-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-bold ${a.tipo === 'atraso' ? 'text-red-800' : 'text-amber-800'}`}>{a.titulo}</p>
                    <p className={`text-xs ${a.tipo === 'atraso' ? 'text-red-600' : 'text-amber-600'}`}>{a.descricao}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      <BancadasDialog open={bancadasOpen} onOpenChange={setBancadasOpen} ordens={ordens as any[]} />
      <PecasDialog open={pecasOpen} onOpenChange={setPecasOpen} ordens={ordens as any[]} />
      <OsAtrasadasDialog open={atrasadasOpen} onOpenChange={setAtrasadasOpen} ordens={ordens as any[]} />
    </div>

  );
}