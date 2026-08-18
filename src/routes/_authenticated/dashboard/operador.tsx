import { createFileRoute, useRouter } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/dashboard/operador")({
  component: DashboardOperador,
});

function OSItem({ os, onClick }: any) {
  const statusColors: any = {
    'aberta': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'em_andamento': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'atrasada': 'bg-red-500/10 text-red-500 border-red-500/20',
    'pronto': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

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
          </div>
          <p className="text-sm font-bold text-foreground">{os.cliente}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{os.descricao}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end mr-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Prazo</span>
          <span className={`text-xs font-black ${os.status === 'atrasada' ? 'text-red-500' : 'text-foreground'}`}>{os.prazo}</span>
        </div>
        <Button 
          size="sm" 
          className="bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase text-[10px] tracking-widest h-9"
          onClick={() => onClick(os.id)}
        >
          <PlayCircle className="mr-2 h-4 w-4 text-primary" />
          Acessar OS
        </Button>
      </div>
    </div>
  );
}

function OperadorKPICard({ title, value, icon: Icon, color = "primary" }: any) {
  const colors: any = {
    primary: "text-primary",
    red: "text-red-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
  };

  return (
    <Card className="border-border bg-card shadow-sm border-b-2 border-b-transparent hover:border-b-primary transition-all">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg bg-slate-50`}>
            <Icon className={`h-4 w-4 ${colors[color]}`} />
          </div>
          <span className="text-2xl font-black text-foreground">{value}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function DashboardOperador() {
  const router = useRouter();

  const handleAccessOS = (id: string) => {
    router.navigate({ to: `/os/${id}` as any });
  };

  const myOrders = [
    { id: "1", numero_os: "OS-1024", cliente: "Mineradora Vale", descricao: "Cilindro Hidráulico de Elevação", status: "em_andamento", prazo: "18/08 (Hoje)", prioridade: "Alta" },
    { id: "2", numero_os: "OS-1025", cliente: "Transportadora Rápido", descricao: "Bomba Hidráulica 45cc", status: "aberta", prazo: "20/08", prioridade: "Média" },
    { id: "3", numero_os: "OS-1018", cliente: "Agrícola Terra Viva", descricao: "Motor Hidráulico Orbital", status: "atrasada", prazo: "15/08", prioridade: "Crítica" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl font-black text-foreground tracking-tight">MINHA <span className="text-primary">BANCADA</span></h2>
        <p className="text-sm text-muted-foreground font-medium">Ordens de serviço atribuídas a você.</p>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OperadorKPICard title="Minha Fila" value="03" icon={ClipboardList} color="primary" />
        <OperadorKPICard title="Prioridades" value="01" icon={AlertTriangle} color="red" />
        <OperadorKPICard title="Checklist Pendente" value="02" icon={CheckCircle2} color="amber" />
        <OperadorKPICard title="Atrasadas" value="01" icon={Clock} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista Principal de OS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Tarefas Ativas
            </h3>
            <Badge variant="secondary" className="bg-slate-900 text-white font-mono">{myOrders.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {myOrders.map(os => (
              <OSItem key={os.id} os={os} onClick={handleAccessOS} />
            ))}
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
