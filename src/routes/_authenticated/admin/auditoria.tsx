import { createFileRoute } from "@tanstack/react-router";
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Download, 
  User, 
  Clock, 
  Tag, 
  ChevronLeft, 
  ChevronRight,
  Database,
  ArrowRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/auditoria" as any)({
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [usuario, setUsuario] = useState("todos");
  const [periodo, setPeriodo] = useState("30");
  const [acao, setAcao] = useState("todas");
  const [entidade, setEntidade] = useState("todas");
  const [os, setOs] = useState("todas");

  // Usaremos dados simulados profissionais baseados no mockup enquanto a tabela de auditoria real é populada
  const logsMock = [
    {
      id: 1,
      usuario: "Maria Silva",
      acao: "Alteração",
      data: "15/04/2026 14:32",
      entidade: "Cliente",
      os: "OS-2026-0042",
      dadosAnteriores: 'status: "Aberto"',
      dadosNovos: 'status: "Em Andamento"'
    },
    {
      id: 2,
      usuario: "João Santos",
      acao: "Criação",
      data: "15/04/2026 11:07",
      entidade: "OS",
      os: "OS-2026-0043",
      dadosAnteriores: "—",
      dadosNovos: 'cliente: "Empresa X"'
    },
    {
      id: 3,
      usuario: "Ana Costa",
      acao: "Exclusão",
      data: "14/04/2026 16:50",
      entidade: "Produto",
      os: "—",
      dadosAnteriores: 'nome: "Item A"',
      dadosNovos: "—"
    },
    {
      id: 4,
      usuario: "Carlos Oliveira",
      acao: "Alteração",
      data: "14/04/2026 09:15",
      entidade: "Cliente",
      os: "—",
      dadosAnteriores: 'telefone: "(11) 9999-88..."',
      dadosNovos: 'telefone: "(11) 7777-66..."'
    },
    {
      id: 5,
      usuario: "Maria Silva",
      acao: "Visualização",
      data: "13/04/2026 22:30",
      entidade: "Relatório",
      os: "—",
      dadosAnteriores: "—",
      dadosNovos: "—"
    }
  ];

  const getAcaoBadge = (tipo: string) => {
    switch (tipo) {
      case "Alteração": return <Badge variant="outline" className="text-[9px] font-bold uppercase border-blue-200 text-blue-600 bg-blue-50">Alteração</Badge>;
      case "Criação": return <Badge variant="outline" className="text-[9px] font-bold uppercase border-emerald-200 text-emerald-600 bg-emerald-50">Criação</Badge>;
      case "Exclusão": return <Badge variant="outline" className="text-[9px] font-bold uppercase border-red-200 text-red-600 bg-red-50">Exclusão</Badge>;
      default: return <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 text-slate-600 bg-slate-50">{tipo}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
            <Database className="h-3 w-3" />
            Sistema / Auditoria
          </h2>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            Logs de Auditoria
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar logs..." 
              className="pl-9 h-11 border-slate-200 shadow-sm focus:border-primary transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-slate-200 shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button className="h-11 px-8 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200">
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-border shadow-md overflow-hidden">
        <CardContent className="p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <User className="h-3 w-3" /> Usuário
              </label>
              <Select value={usuario} onValueChange={setUsuario}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="maria">Maria Silva</SelectItem>
                  <SelectItem value="joao">João Santos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Período
              </label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Últimos 30 dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Filter className="h-3 w-3" /> Ação
              </label>
              <Select value={acao} onValueChange={setAcao}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="criacao">Criação</SelectItem>
                  <SelectItem value="alteracao">Alteração</SelectItem>
                  <SelectItem value="exclusao">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Tag className="h-3 w-3" /> Entidade
              </label>
              <Select value={entidade} onValueChange={setEntidade}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="os">OS</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <History className="h-3 w-3" /> OS
              </label>
              <Select value={os} onValueChange={setOs}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="os1">OS-2026-0042</SelectItem>
                  <SelectItem value="os2">OS-2026-0043</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card className="border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Logs de Auditoria
          </CardTitle>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <span>Total: 1.247 registros</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Página 1 de 42</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-border">
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-6 h-12">Usuário</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12">Ação</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12">Data</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12">Entidade</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12">OS</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12">Dados Anteriores</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12">Dados Novos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsMock.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 border-border group transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                          {log.usuario.substring(0, 2)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{log.usuario}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {getAcaoBadge(log.acao)}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-[11px] font-bold text-slate-500">{log.data}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border-slate-200">
                        {log.entidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-[11px] font-black text-slate-900 tracking-tight">{log.os}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[180px] truncate bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[9px] text-slate-500">
                        {log.dadosAnteriores}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[180px] truncate bg-emerald-50/50 p-2 rounded border border-emerald-100 font-mono text-[9px] text-emerald-600">
                        {log.dadosNovos}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação */}
          <div className="p-6 border-t bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
              <span>Exibir</span>
              <Select defaultValue="25">
                <SelectTrigger className="w-16 h-8 bg-white border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-4 font-bold uppercase text-[9px] tracking-widest border-slate-200">
                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <div className="flex items-center gap-1">
                {[1, 2, 3, "...", 42].map((p, i) => (
                  <Button 
                    key={i}
                    variant={p === 1 ? "default" : "outline"}
                    size="icon"
                    className={`h-9 w-9 text-[10px] font-black ${p === 1 ? "bg-slate-900 shadow-md" : "border-slate-200"}`}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="h-9 px-4 font-bold uppercase text-[9px] tracking-widest border-slate-200">
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
