import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  MapPin,
  TrendingUp,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

const mockClientes = [
  { id: "1", nome: "Indústria Metalúrgica SA", cnpj: "12.345.678/0001-90", cidade: "São Paulo - SP", nivel: "A", vendedor: "Roberto Lima", status: "Ativo" },
  { id: "2", nome: "Agrícola Vale Verde", cnpj: "98.765.432/0001-21", cidade: "Curitiba - PR", nivel: "B", vendedor: "Ana Paula", status: "Ativo" },
  { id: "3", nome: "Mineradora Serra Azul", cnpj: "45.678.901/0001-33", cidade: "Belo Horizonte - MG", nivel: "A", vendedor: "Roberto Lima", status: "Inadimplente" },
  { id: "4", nome: "Transportes Rodoviários", cnpj: "23.456.789/0001-44", cidade: "Campinas - SP", nivel: "C", vendedor: "Carlos Silva", status: "Ativo" },
];

function ClientesPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">Base de <span className="text-primary">Clientes</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Gestão centralizada da carteira Alternativa Hidráulica.</p>
        </div>
        <Button className="btn-industrial h-11 px-6 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs">
          <UserPlus className="mr-2 h-4 w-4" />
          Cadastrar Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome fantasia, CNPJ ou cidade..." 
            className="pl-10 h-11 border-border bg-white shadow-sm focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 border-border font-bold uppercase text-[10px] tracking-widest">
            <Filter className="mr-2 h-4 w-4 text-primary" />
            Nível (A/B/C)
          </Button>
          <Button variant="outline" className="h-11 border-border font-bold uppercase text-[10px] tracking-widest">
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            Vendedor
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockClientes.map((cliente) => (
          <Card key={cliente.id} className="group border-border hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden border-t-4 border-t-slate-200 hover:border-t-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                </div>
                <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${
                  cliente.nivel === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  cliente.nivel === 'B' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  Nível {cliente.nivel}
                </Badge>
              </div>
              <CardTitle className="mt-4 text-base font-black text-foreground group-hover:text-primary transition-colors uppercase leading-tight">
                {cliente.nome}
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                CNPJ: {cliente.cnpj}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {cliente.cidade}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Resp: {cliente.vendedor}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Badge className={`text-[9px] font-black uppercase tracking-widest ${
                  cliente.status === 'Ativo' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {cliente.status}
                </Badge>
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                      <DropdownMenuItem className="text-xs font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Ver Ficha Completa</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer text-primary">Nova Ordem Serviço</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Histórico Financeiro</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
