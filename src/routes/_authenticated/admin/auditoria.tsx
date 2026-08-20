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
import { Progress } from "@/components/ui/progress";
import { AlertCircle, HardDrive, Loader2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { data: storageStats, isLoading: isLoadingStorage, error: storageError } = useQuery({
    queryKey: ["storage-stats"],
    queryFn: async () => {
      // @ts-ignore - a RPC será criada via migração e os tipos serão atualizados
      const { data, error } = await supabase.rpc("dev_get_storage_stats" as any);
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalGeralBytes = (storageStats || []).reduce((acc: number, curr: any) => acc + Number(curr.total_bytes), 0);
  const limitBytes = 1024 * 1024 * 1024; // 1GB
  const porcentagemUso = Math.min((totalGeralBytes / limitBytes) * 100, 100);
  const [search, setSearch] = useState("");
  const [usuario, setUsuario] = useState("todos");
  const [periodo, setPeriodo] = useState("30");
  const [acao, setAcao] = useState("todas");
  const [entidade, setEntidade] = useState("todas");
  const [os, setOs] = useState("todas");

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['logs-sistema', search, usuario, periodo, acao, entidade, os],
    queryFn: async () => {
      let query = supabase.from('logs_sistema').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`usuario_nome.ilike.%${search}%,os_numero.ilike.%${search}%,acao.ilike.%${search}%,entidade.ilike.%${search}%`);
      }
      if (usuario !== 'todos') query = query.eq('usuario_id', usuario);
      if (acao !== 'todas') query = query.eq('acao', acao);
      if (entidade !== 'todas') query = query.eq('entidade', entidade);
      if (os !== 'todas') query = query.eq('os_numero', os);
      
      const { data, count, error } = await query
        .order('criado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data, count };
    }
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['logs-filter-options'],
    queryFn: async () => {
      const [users, osNumbers] = await Promise.all([
        supabase.from('usuarios').select('id, nome'),
        supabase.from('ordens_servico').select('numero_os').limit(50)
      ]);
      return {
        users: users.data || [],
        osNumbers: osNumbers.data || []
      };
    }
  });

  const logs = logsData?.data || [];
  const totalLogs = logsData?.count || 0;

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
        
        <div className="flex flex-col md:flex-row items-center gap-6">
           {/* Storage Summary Badge */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <HardDrive className="h-3 w-3" />
            Storage: {formatBytes(totalGeralBytes)} / 1GB ({porcentagemUso.toFixed(1)}%)
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
      </div>

      {/* Card de Storage */}
      <Card className="border-border shadow-md overflow-hidden bg-slate-900 text-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 py-4 px-6">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Consumo de Storage (Supabase)
            </CardTitle>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <span>Limite Free Tier: 1 GB</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {storageError ? (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded border border-red-400/20">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Erro ao carregar storage: {storageError instanceof Error ? storageError.message : "Erro desconhecido"}</span>
            </div>
          ) : isLoadingStorage ? (
            <div className="h-24 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-black tracking-tighter text-white uppercase">
                    {formatBytes(totalGeralBytes)}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                    Uso total em todos os buckets
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-primary italic">
                    {porcentagemUso.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Capacidade utilizada
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Progress value={porcentagemUso} className="h-3 bg-white/5 [&>div]:bg-primary" />
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-600">
                  <span>0 GB</span>
                  <span>1 GB</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
                {(storageStats || []).map((bucket: any) => (
                  <div key={bucket.nome_bucket} className="bg-white/5 border border-white/10 p-3 rounded group hover:bg-white/10 transition-colors">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {bucket.nome_bucket}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] font-bold text-slate-500 uppercase">
                        {bucket.quantidade_arquivos} arquivos
                      </div>
                      <div className="text-xs font-black text-white">
                        {formatBytes(Number(bucket.total_bytes))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  {filterOptions?.users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
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
                  <SelectItem value="Criação">Criação</SelectItem>
                  <SelectItem value="Alteração">Alteração</SelectItem>
                  <SelectItem value="Exclusão">Exclusão</SelectItem>
                  <SelectItem value="Sincronização">Sincronização</SelectItem>
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
                <HistoryIcon className="h-3 w-3" /> OS
              </label>
              <Select value={os} onValueChange={setOs}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {filterOptions?.osNumbers.map((o: any) => (
                    <SelectItem key={o.numero_os} value={o.numero_os}>{o.numero_os}</SelectItem>
                  ))}
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
            <span>Total: {totalLogs} registros</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Últimos 50 eventos</span>
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
                {isLoadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground uppercase text-[10px] font-bold">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Sincronizando logs reais...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground uppercase text-[10px] font-bold">
                      Nenhum log encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : logs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 border-border group transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                          {(log.usuario_nome || 'S').substring(0, 2)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{log.usuario_nome || 'Sistema'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {getAcaoBadge(log.acao)}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-[11px] font-bold text-slate-500">
                        {log.criado_em ? format(new Date(log.criado_em), "dd/MM/yyyy HH:mm") : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border-slate-200">
                        {log.entidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-[11px] font-black text-slate-900 tracking-tight">{log.os_numero || '—'}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[180px] truncate bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[9px] text-slate-500">
                        {log.dados_anteriores ? JSON.stringify(log.dados_anteriores) : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[180px] truncate bg-emerald-50/50 p-2 rounded border border-emerald-100 font-mono text-[9px] text-emerald-600">
                        {log.dados_novos ? JSON.stringify(log.dados_novos) : '—'}
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
