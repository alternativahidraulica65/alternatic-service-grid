import { createFileRoute, Link } from "@tanstack/react-router";
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
  RefreshCw,
  FileWarning,
  Eye,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  head: () => ({ meta: [
    { title: "Auditoria — Alternativa Hidráulica" },
    { name: "description", content: "Histórico de ações e rastreabilidade da operação." },
    { property: "og:title", content: "Auditoria — Alternativa Hidráulica" },
    { property: "og:description", content: "Histórico de ações e rastreabilidade da operação." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuditoriaPage,
});

type LogRow = {
  id: string;
  usuario_nome: string | null;
  acao: string;
  entidade: string;
  os_numero: string | null;
  os_id: string | null;
  descricao: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  criado_em: string;
};

const PERIODOS: Record<string, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  todos: null,
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resumoAlteracao(log: LogRow) {
  const antes = (log.dados_anteriores || {}) as Record<string, unknown>;
  const depois = (log.dados_novos || {}) as Record<string, unknown>;
  const chaves = Array.from(new Set([...Object.keys(antes), ...Object.keys(depois)]));
  const alteradas = chaves.filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
  return alteradas.slice(0, 4).map((campo) => ({
    campo,
    antes: antes[campo],
    depois: depois[campo],
  }));
}

function valorCurto(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

function badgeAcao(acao: string) {
  const a = (acao || "").toLowerCase();
  const base = "text-[9px] font-black uppercase tracking-widest";
  if (a.includes("cria") || a.includes("insert"))
    return <Badge variant="outline" className={`${base} border-emerald-200 text-emerald-700 bg-emerald-50`}>{acao}</Badge>;
  if (a.includes("exclus") || a.includes("delete"))
    return <Badge variant="outline" className={`${base} border-red-200 text-red-700 bg-red-50`}>{acao}</Badge>;
  if (a.includes("status"))
    return <Badge variant="outline" className={`${base} border-amber-200 text-amber-700 bg-amber-50`}>{acao}</Badge>;
  if (a.includes("altera") || a.includes("update"))
    return <Badge variant="outline" className={`${base} border-blue-200 text-blue-700 bg-blue-50`}>{acao}</Badge>;
  return <Badge variant="outline" className={`${base} border-slate-200 text-slate-600 bg-slate-50`}>{acao || "—"}</Badge>;
}

function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [usuario, setUsuario] = useState("todos");
  const [periodo, setPeriodo] = useState("30");
  const [acao, setAcao] = useState("todas");
  const [entidade, setEntidade] = useState("todas");
  const [porPagina, setPorPagina] = useState("25");
  const [pagina, setPagina] = useState(1);
  const [detalhe, setDetalhe] = useState<LogRow | null>(null);

  const { data: logs = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["logs-auditoria", periodo],
    queryFn: async () => {
      let query = supabase
        .from("logs_sistema")
        .select("id, usuario_nome, acao, entidade, os_numero, os_id, descricao, dados_anteriores, dados_novos, criado_em")
        .order("criado_em", { ascending: false })
        .limit(1000);

      const dias = PERIODOS[periodo];
      if (dias) {
        const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("criado_em", desde);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as LogRow[];
    },
  });

  const usuarios = useMemo(
    () => Array.from(new Set(logs.map((l) => l.usuario_nome).filter(Boolean) as string[])).sort(),
    [logs],
  );
  const acoes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.acao).filter(Boolean))).sort(),
    [logs],
  );
  const entidades = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entidade).filter(Boolean))).sort(),
    [logs],
  );

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (usuario !== "todos" && (l.usuario_nome || "") !== usuario) return false;
      if (acao !== "todas" && l.acao !== acao) return false;
      if (entidade !== "todas" && l.entidade !== entidade) return false;
      if (!termo) return true;
      const alvo = [l.usuario_nome, l.acao, l.entidade, l.os_numero, l.descricao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [logs, search, usuario, acao, entidade]);

  const tamanho = Number(porPagina);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamanho));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * tamanho, paginaAtual * tamanho);

  const kpis = useMemo(() => {
    const hoje = new Date().toDateString();
    return {
      total: filtrados.length,
      hoje: filtrados.filter((l) => new Date(l.criado_em).toDateString() === hoje).length,
      usuarios: new Set(filtrados.map((l) => l.usuario_nome || "Sistema")).size,
      os: new Set(filtrados.map((l) => l.os_numero).filter(Boolean)).size,
    };
  }, [filtrados]);

  function exportarCsv() {
    const linhas = [
      ["Data", "Usuário", "Ação", "Entidade", "OS", "Descrição"],
      ...filtrados.map((l) => [
        formatarData(l.criado_em),
        l.usuario_nome || "Sistema",
        l.acao,
        l.entidade,
        l.os_numero || "",
        (l.descricao || "").replace(/[\n;]/g, " "),
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b pb-6">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para o Dashboard
          </Link>
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
            <Database className="h-3 w-3" />
            Sistema / Auditoria
          </h2>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Logs de Auditoria</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Registros reais de todas as ações executadas no sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por usuário, OS, ação..."
              className="pl-9 h-11 border-slate-200 shadow-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagina(1);
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-11 px-5 font-bold uppercase text-[10px] tracking-widest border-slate-200 shadow-sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            onClick={exportarCsv}
            disabled={!filtrados.length}
            className="h-11 px-6 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Registros no período", valor: kpis.total, cor: "text-slate-900" },
          { label: "Eventos hoje", valor: kpis.hoje, cor: "text-primary" },
          { label: "Usuários envolvidos", valor: kpis.usuarios, cor: "text-blue-600" },
          { label: "OS impactadas", valor: kpis.os, cor: "text-emerald-600" },
        ].map((k) => (
          <Card key={k.label} className="border-border shadow-sm">
            <CardContent className="p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{k.label}</p>
              <p className={`text-3xl font-black tracking-tighter mt-2 ${k.cor}`}>{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-border shadow-md overflow-hidden">
        <CardContent className="p-5 bg-slate-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <User className="h-3 w-3" /> Usuário
              </label>
              <Select value={usuario} onValueChange={(v) => { setUsuario(v); setPagina(1); }}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Período
              </label>
              <Select value={periodo} onValueChange={(v) => { setPeriodo(v); setPagina(1); }}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="todos">Todo o histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Filter className="h-3 w-3" /> Ação
              </label>
              <Select value={acao} onValueChange={(v) => { setAcao(v); setPagina(1); }}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {acoes.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Tag className="h-3 w-3" /> Entidade
              </label>
              <Select value={entidade} onValueChange={(v) => { setEntidade(v); setPagina(1); }}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {entidades.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <HistoryIcon className="h-3.5 w-3.5" />
            Trilha de eventos
          </CardTitle>
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <span>{filtrados.length} registros</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Página {paginaAtual} de {totalPaginas}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-border">
                  {["Data", "Usuário", "Ação", "Entidade", "OS", "Detalhe", ""].map((h, i) => (
                    <TableHead key={i} className="text-[9px] font-black uppercase tracking-widest text-slate-500 h-12 first:px-6">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                      Carregando registros...
                    </TableCell>
                  </TableRow>
                )}

                {isError && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-xs font-bold uppercase tracking-widest text-red-500">
                      Não foi possível carregar os logs.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && visiveis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <FileWarning className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Nenhum registro encontrado para os filtros aplicados
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {visiveis.map((log) => {
                  const alteracoes = resumoAlteracao(log);
                  return (
                    <TableRow key={log.id} className="hover:bg-slate-50/60 border-border transition-colors align-top">
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-600">{formatarData(log.criado_em)}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 border border-slate-200 uppercase">
                            {(log.usuario_nome || "SY").substring(0, 2)}
                          </div>
                          <span className="text-sm font-bold text-slate-700">{log.usuario_nome || "Sistema"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">{badgeAcao(log.acao)}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border-slate-200">
                          {log.entidade || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-[11px] font-black text-slate-900 tracking-tight">{log.os_numero || "—"}</span>
                      </TableCell>
                      <TableCell className="py-4 max-w-[420px]">
                        {log.descricao && (
                          <p className="text-[11px] font-medium text-slate-600 mb-1">{log.descricao}</p>
                        )}
                        {alteracoes.length > 0 ? (
                          <div className="space-y-1">
                            {alteracoes.map((a) => (
                              <div key={a.campo} className="flex items-center gap-2 font-mono text-[9px]">
                                <span className="font-bold text-slate-500">{a.campo}:</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 line-through">{valorCurto(a.antes)}</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">{valorCurto(a.depois)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !log.descricao && <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => setDetalhe(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="p-5 border-t bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
              <span>Exibir</span>
              <Select value={porPagina} onValueChange={(v) => { setPorPagina(v); setPagina(1); }}>
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
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="h-9 px-4 font-bold uppercase text-[9px] tracking-widest border-slate-200"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">
                {paginaAtual} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="h-9 px-4 font-bold uppercase text-[9px] tracking-widest border-slate-200"
              >
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              {detalhe?.acao} · {detalhe?.entidade} {detalhe?.os_numero ? `· ${detalhe.os_numero}` : ""}
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Usuário</p>
                  <p className="font-bold text-slate-700">{detalhe.usuario_nome || "Sistema"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data</p>
                  <p className="font-bold text-slate-700">{formatarData(detalhe.criado_em)}</p>
                </div>
              </div>
              {detalhe.descricao && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição</p>
                  <p className="font-medium text-slate-700">{detalhe.descricao}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Dados anteriores</p>
                  <pre className="bg-slate-50 border border-slate-100 rounded p-3 font-mono text-[10px] text-slate-600 overflow-x-auto">
                    {JSON.stringify(detalhe.dados_anteriores ?? {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Dados novos</p>
                  <pre className="bg-emerald-50/50 border border-emerald-100 rounded p-3 font-mono text-[10px] text-emerald-700 overflow-x-auto">
                    {JSON.stringify(detalhe.dados_novos ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
