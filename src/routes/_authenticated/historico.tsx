import { createFileRoute } from "@tanstack/react-router";
import { 
  ClipboardList, 
  Clock, 
  History, 
  Search, 
  Filter, 
  Eye, 
  Download,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoGlobal,
});

const mockHistorico = [
  { id: "1", numero_os: "OS-1024", cliente: "Indústria Metalúrgica SA", data: "18/08/2026", status: "EM ANDAMENTO", tecnico: "João Silva", valor: "R$ 4.500,00" },
  { id: "2", numero_os: "OS-1020", cliente: "Agrícola Vale Verde", data: "15/08/2026", status: "ORÇAMENTO", tecnico: "Carlos Souza", valor: "R$ 2.800,00" },
  { id: "3", numero_os: "OS-1015", cliente: "Transportes Rodoviários", data: "12/08/2026", status: "PRONTO", tecnico: "Ana Costa", valor: "R$ 1.200,00" },
  { id: "4", numero_os: "OS-1010", cliente: "Mineradora Serra Azul", data: "10/08/2026", status: "ENTREGUE", tecnico: "Roberto Lima", valor: "R$ 12.400,00" },
  { id: "5", numero_os: "OS-0995", cliente: "Construções Delta", data: "05/08/2026", status: "GARANTIA", tecnico: "João Silva", valor: "R$ 0,00" },
];

function HistoricoGlobal() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">Histórico <span className="text-primary">Global</span></h2>
          <p className="text-sm text-muted-foreground font-medium">Rastreabilidade total de todas as Ordens de Serviço.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 border-border font-bold uppercase text-[10px] tracking-widest bg-white">
            <Download className="mr-2 h-4 w-4 text-primary" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Card className="border-border shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por OS, Cliente, Técnico ou CNPJ..." 
                className="pl-10 h-11 border-border focus:ring-primary"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="date" 
                className="pl-10 h-11 border-border focus:ring-primary"
              />
            </div>
            <Button className="h-11 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
              Filtrar Registros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card className="border-border shadow-md bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Nº OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Abertura</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Técnico</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Total</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHistorico.map((item) => (
                <TableRow key={item.id} className="border-border hover:bg-slate-50 transition-colors">
                  <TableCell className="py-4">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">{item.numero_os}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground uppercase">{item.cliente}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-muted-foreground">{item.data}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${
                      item.status === 'PRONTO' || item.status === 'ENTREGUE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      item.status === 'ATRASADA' || item.status === 'GARANTIA' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-primary/5 text-primary border-primary/20'
                    }`}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground uppercase tracking-tighter">{item.tecnico}</TableCell>
                  <TableCell className="text-xs font-black text-foreground">{item.valor}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary">
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Paginação Mockada */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">Exibindo 5 de 156 registros encontrados</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 border-border text-[10px] font-black uppercase" disabled>Anterior</Button>
          <Button variant="outline" size="sm" className="h-9 border-border text-[10px] font-black uppercase">Próximo</Button>
        </div>
      </div>
    </div>
  );
}
