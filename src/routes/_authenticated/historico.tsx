import { createFileRoute } from "@tanstack/react-router";
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreVertical,
  Calendar,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const ordens = [
    { id: "1024", cliente: "Indústria Metalúrgica SA", data: "12/08/2026", status: "Em Vistoria", prioridade: "Alta", tecnico: "João Silva", valor: 3600.00 },
    { id: "1023", cliente: "Construtora Horizonte", data: "10/08/2026", status: "Aprovado", prioridade: "Normal", tecnico: "Carlos Souza", valor: 12450.00 },
    { id: "1022", cliente: "Agrícola Vale Verde", data: "08/08/2026", status: "Pronto", prioridade: "Alta", tecnico: "João Silva", valor: 890.00 },
    { id: "1021", cliente: "Transportes Rapidez", data: "05/08/2026", status: "Orcamento", prioridade: "Baixa", tecnico: "Marcos Paulo", valor: 5200.00 },
    { id: "1020", cliente: "Usina Delta Power", data: "01/08/2026", status: "Entregue", prioridade: "Normal", tecnico: "Carlos Souza", valor: 22100.00 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'em vistoria': return <Badge className="bg-amber-500 text-white border-none text-[9px] font-black uppercase tracking-widest">Vistoria</Badge>;
      case 'aprovado': return <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase tracking-widest">Aprovado</Badge>;
      case 'pronto': return <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase tracking-widest">Pronto</Badge>;
      case 'orcamento': return <Badge className="bg-slate-700 text-white border-none text-[9px] font-black uppercase tracking-widest">Orçamento</Badge>;
      case 'entregue': return <Badge className="bg-slate-400 text-white border-none text-[9px] font-black uppercase tracking-widest">Entregue</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">HISTÓRICO DE <span className="text-primary">ORDENS DE SERVIÇO</span></h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Rastreabilidade completa de todas as manutenções.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 border-border font-bold uppercase text-[10px] tracking-widest">
            <Download className="mr-2 h-4 w-4 text-primary" />
            Exportar XLS
          </Button>
          <Link to="/os/nova">
            <Button className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6">
              Nova OS
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Total em Aberto", value: "48", icon: Clock, color: "primary" },
          { label: "Finalizadas (Mês)", value: "124", icon: History, color: "emerald" },
          { label: "Aguardando Aprovação", value: "12", icon: AlertCircle, color: "amber" },
          { label: "Faturamento Previsto", value: "R$ 84k", icon: ArrowRight, color: "slate" },
        ].map((stat, i) => (
          <Card key={i} className="border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 text-${stat.color}-500`} />
              </div>
              <p className="text-2xl font-black text-foreground">{stat.value}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por OS, cliente ou técnico..." 
                className="pl-10 h-10 border-border bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 border border-border rounded-lg bg-white">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Últimos 30 dias</span>
              </div>
              <Button variant="outline" size="sm" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
                <Filter className="mr-2 h-4 w-4 text-primary" />
                Filtros Avançados
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">ID / OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Cliente / Empresa</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Técnico Resp.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Data Abertura</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right">Valor (R$)</TableHead>
                <TableHead className="py-4 pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.map((os) => (
                <TableRow key={os.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors">#{os.id}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div>
                      <p className="text-sm font-bold text-foreground uppercase tracking-tight">{os.cliente}</p>
                      <Badge variant="outline" className={`text-[8px] font-bold h-4 ${os.prioridade === 'Alta' ? 'text-red-500 border-red-200' : 'text-slate-400 border-slate-200'}`}>
                        Prioridade {os.prioridade}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    {getStatusBadge(os.status)}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px]">JS</div>
                      {os.tecnico}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-xs font-bold text-foreground">{os.data}</TableCell>
                  <TableCell className="py-4 text-right pr-6 font-black text-foreground">
                    {os.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                        <DropdownMenuItem asChild>
                          <Link to={`/os/${os.id}`} className="w-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer flex items-center gap-2">
                            <Eye className="h-3 w-3" /> Ver Detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Reabrir OS</DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Imprimir Laudo</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Exibindo 5 de 1.240 ordens de serviço</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 border-border">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 px-3 border-primary text-primary text-[10px] font-bold uppercase">1</Button>
          <Button variant="outline" className="h-8 px-3 border-border text-[10px] font-bold uppercase">2</Button>
          <Button variant="outline" className="h-8 px-3 border-border text-[10px] font-bold uppercase">3</Button>
          <Button variant="outline" size="icon" className="h-8 w-8 border-border">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
