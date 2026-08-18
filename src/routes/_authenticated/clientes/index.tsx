import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  TrendingUp,
  History,
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

export const Route = createFileRoute("/_authenticated/clientes/")({
  component: ClientesPage,
});

function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const clientes = [
    { id: 1, nome: "Indústria Metalúrgica SA", cnpj: "12.345.678/0001-90", cidade: "Joinville/SC", categoria: "A", status: "Ativo", ultimaOS: "10/08/2026" },
    { id: 2, nome: "Construtora Horizonte", cnpj: "98.765.432/0001-10", cidade: "Curitiba/PR", categoria: "B", status: "Ativo", ultimaOS: "05/08/2026" },
    { id: 3, nome: "Transportes Rapidez Ltda", cnpj: "45.678.901/0001-22", cidade: "Blumenau/SC", categoria: "C", status: "Inativo", ultimaOS: "15/06/2026" },
    { id: 4, nome: "Agrícola Vale Verde", cnpj: "11.222.333/0001-44", cidade: "Cascavel/PR", categoria: "A", status: "Ativo", ultimaOS: "12/08/2026" },
  ];

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">GESTÃO DE <span className="text-primary">CLIENTES</span></h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Base de dados unificada e histórico comercial.</p>
        </div>
        <Button className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <Badge variant="outline" className="text-[9px] font-black uppercase">Total</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">1.240</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clientes Cadastrados</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Curva A</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">85</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clientes Premium</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <History className="h-5 w-5 text-amber-500" />
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Inativos</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">12</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem OS (90 dias)</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest">Prospecção</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">24</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Novos este mês</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, CNPJ ou cidade..." 
                className="pl-10 h-10 border-border bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
                <Filter className="mr-2 h-4 w-4 text-primary" />
                Filtros
              </Button>
              <Button variant="ghost" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exportar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Cliente / Razão Social</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">CNPJ</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Cat.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Cidade/UF</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Última OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Status</TableHead>
                <TableHead className="py-4 pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                        <Building2 className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">{cliente.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[8px] font-bold h-4">Contrato Ativo</Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[11px] font-mono text-muted-foreground">{cliente.cnpj}</TableCell>
                  <TableCell className="py-4 text-center">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black border ${
                      cliente.categoria === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      cliente.categoria === 'B' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {cliente.categoria}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                      <MapPin className="h-3 w-3 text-primary" />
                      {cliente.cidade}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-xs font-bold text-foreground">{cliente.ultimaOS}</TableCell>
                  <TableCell className="py-4 text-center">
                    <Badge className={`text-[9px] font-black uppercase tracking-widest ${
                      cliente.status === 'Ativo' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                    }`}>{cliente.status}</Badge>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Ver Perfil</DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Nova OS</DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Histórico Financeiro</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
