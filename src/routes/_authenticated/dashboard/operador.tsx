import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Wrench, 
  Clock, 
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  FileSearch,
  Camera
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/operador")({
  component: DashboardOperador,
});

function OSItem({ os, onClick }: any) {
  const statusColors: any = {
    'aberta': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'vistoria': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'em_andamento': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'atrasada': 'bg-red-500/10 text-red-500 border-red-500/20',
    'pronto': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  const isVencida = os.prazo_acordado && new Date(os.prazo_acordado) < new Date();

  return (
    <div className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center border border-border bg-slate-50 transition-colors group-hover:bg-primary/5`}>
          <Wrench className="h-6 w-6 text-slate-400 group-hover:text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-primary uppercase tracking-widest">{os.numero_os}</span>
            <Badge variant="outline" className={`text-[9px] uppercase font-bold ${statusColors[os.status] || ''}`}>
              {os.status}
            </Badge>
            {isVencida && (
              <Badge variant="outline" className="text-[9px] uppercase font-bold bg-red-500/10 text-red-500 border-red-500/20">
                Atrasada
              </Badge>
            )}
          </div>
          <p className="text-sm font-bold text-foreground">{os.cliente}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{os.descricao}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end mr-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Prazo</span>
          <span className={`text-xs font-black ${isVencida ? 'text-red-500' : 'text-foreground'}`}>
            {os.prazo_acordado ? new Date(os.prazo_acordado).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <Button 
          size="sm" 
          className="bg-green-700 text-white hover:bg-green-800 font-bold uppercase text-[10px] tracking-widest h-9"
          onClick={() => onClick(os.id)}
        >
          <PlayCircle className="mr-2 h-4 w-4 text-white" />
          Acessar OS
        </Button>
      </div>
    </div>
  );
}

function OperadorKPICard({ title, value, icon: Icon, color = "primary", isActive, onClick }: any) {
  const styles: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    red: "bg-red-600 text-white hover:bg-red-700",
    amber: "bg-amber-500 text-white hover:bg-amber-600",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  const activeStyle = isActive 
    ? "ring-4 ring-offset-2 ring-primary scale-105 z-10" 
    : "opacity-90 hover:opacity-100 hover:scale-[1.02]";

  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 border-none shadow-md ${styles[color]} ${activeStyle}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-white/20">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <span className="text-3xl font-black">{value}</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/90">{title}</p>
      </CardContent>
    </Card>
  );
}

function DashboardOperador() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>('todas');

  const { data: myOrders = [] } = useQuery({
    queryKey: ['operador_minha_bancada'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      if (!user?.email) return [];

      const { data: profile } = await supabase.from('usuarios').select('id').eq('email', user.email).single();
      if (!profile) return [];

      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('tecnico_id', profile.id)
        .in('status', ['aberta', 'vistoria', 'orcamento_pendente', 'usinagem', 'montagem']);
      
      if (error) throw error;
      return data;
    }
  });

  const handleAccessOS = (id: string) => {
    router.navigate({ to: `/os/${id}` as any });
  };

  const isAtrasada = (o: any) => o.status === 'atrasada' || (o.prazo_acordado && new Date(o.prazo_acordado) < new Date());

  const atrasadasCount = myOrders.filter(isAtrasada).length.toString().padStart(2, '0');
  const triagemCount = myOrders.filter((o: any) => o.status === 'aberta').length.toString().padStart(2, '0');
  const vistoriaCount = myOrders.filter((o: any) => o.status === 'vistoria').length.toString().padStart(2, '0');

  let filteredOrders = myOrders;
  if (activeFilter === 'atrasadas') {
    filteredOrders = myOrders.filter(isAtrasada);
  } else if (activeFilter === 'em_triagem') {
    filteredOrders = myOrders.filter((o: any) => o.status === 'aberta');
  } else if (activeFilter === 'em_vistoria') {
    filteredOrders = myOrders.filter((o: any) => o.status === 'vistoria');
  }

  const getFilterLabel = () => {
    switch(activeFilter) {
      case 'atrasadas': return 'Atrasadas';
      case 'em_triagem': return 'Em Triagem';
      case 'em_vistoria': return 'Em Vistoria';
      default: return 'Ativas';
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl font-black text-foreground tracking-tight">MINHA <span className="text-primary">BANCADA</span></h2>
        <p className="text-sm text-muted-foreground font-medium">Ordens de serviço atribuídas a você.</p>
      </div>

      {/* KPIs Rápidos com Filtro Integrado */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OperadorKPICard 
          title="Minha Fila" 
          value={myOrders.length.toString().padStart(2, '0')} 
          icon={ClipboardList} 
          color="primary" 
          isActive={activeFilter === 'todas'}
          onClick={() => setActiveFilter('todas')}
        />
        <OperadorKPICard 
          title="Atrasadas" 
          value={atrasadasCount} 
          icon={AlertTriangle} 
          color="red" 
          isActive={activeFilter === 'atrasadas'}
          onClick={() => setActiveFilter('atrasadas')}
        />
        <OperadorKPICard 
          title="Em Triagem" 
          value={triagemCount} 
          icon={CheckCircle2} 
          color="amber" 
          isActive={activeFilter === 'em_triagem'}
          onClick={() => setActiveFilter('em_triagem')}
        />
        <OperadorKPICard 
          title="Em Vistoria" 
          value={vistoriaCount} 
          icon={Clock} 
          color="emerald" 
          isActive={activeFilter === 'em_vistoria'}
          onClick={() => setActiveFilter('em_vistoria')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista Principal de OS Filtrada */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Tarefas {getFilterLabel()}
            </h3>
            <Badge variant="secondary" className="bg-slate-900 text-white font-mono">
              {filteredOrders.length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest border-2 border-dashed border-border rounded-xl bg-slate-50">
                Nenhuma OS encontrada neste filtro
              </div>
            ) : (
              filteredOrders.map((os: any) => (
                <OSItem key={os.id} os={os} onClick={handleAccessOS} />
              ))
            )}
          </div>
        </div>

        {/* Módulo Lateral: Próximos Passos / Guias */}
        <div className="space-y-6">
          <Card className="border-border shadow-md bg-slate-900 text-white">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-primary" />
                Guia Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Triagem Eficiente</p>
                <p className="text-[10px] text-white/60 leading-relaxed font-medium">Sempre tire fotos de todos os ângulos antes de desmontar. Registre danos na carcaça imediatamente.</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Peças e Organização</p>
                <p className="text-[10px] text-white/60 leading-relaxed font-medium">Ao desmontar, registre a localização exata da peça na prateleira para evitar perdas.</p>
              </div>
              <Button className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-11">
                <Camera className="mr-2 h-4 w-4" />
                Novo Registro Fotográfico
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suporte Técnico</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-[10px] text-muted-foreground font-medium mb-4">Dúvidas sobre o laudo ou diagnóstico? Fale com o Gestor de Produção.</p>
               <Button variant="outline" className="w-full border-input text-[10px] font-bold uppercase tracking-widest">Chamar Gestor</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
