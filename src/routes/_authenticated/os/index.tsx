import { RemoverSelecionados } from "@/components/RemoverSelecionados";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { FiltrosSalvos } from "@/components/FiltrosSalvos";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Download, Wrench, X, Plus } from "lucide-react";
import { ROTULO_FASE, faseDoStatus } from "@/lib/os-fluxo";

export const Route = createFileRoute("/_authenticated/os/")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço — Alternativa Hidráulica" },
      {
        name: "description",
        content: "Lista completa de ordens de serviço com filtros por período, status, vendedor e empresa emissora.",
      },
      { property: "og:title", content: "Ordens de Serviço — Alternativa Hidráulica" },
      {
        property: "og:description",
        content: "Consulte, filtre, selecione e exporte ordens de serviço da operação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListaOs,
});

const fmtData = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(String(v).length <= 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const PERIODOS: Record<string, number | null> = {
  todos: null,
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
};

function ListaOs() {
  const router = useRouter();
  const { isDiretor, isFinanceiro } = Route.useRouteContext() as any;
  const podeVerValores = !!(isDiretor || isFinanceiro);

  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [vendedor, setVendedor] = useState("todos");
  const [empresa, setEmpresa] = useState("todas");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["os_lista_completa"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ordens_servico")
        .select(
          "id, numero_os, cliente, cliente_id, status, status_financeiro, prioridade, data_abertura, criado_em, data_previsao_conclusao, data_entrega, valor_final, valor_total, empresa_id",
        )
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["os_lista_clientes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clientes")
        .select("id, nome, vendedor_id, venda_propria");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ["os_lista_vendedores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vendedores")
        .select("id, nome, apelido")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["os_lista_empresas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("empresas_emissoras")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const mapaClientes = useMemo(() => {
    const m = new Map<string, any>();
    clientes.forEach((c: any) => m.set(String(c.id), c));
    return m;
  }, [clientes]);

  const mapaVendedores = useMemo(() => {
    const m = new Map<string, any>();
    vendedores.forEach((v: any) => m.set(String(v.id), v));
    return m;
  }, [vendedores]);

  const mapaEmpresas = useMemo(() => {
    const m = new Map<string, any>();
    empresas.forEach((e: any) => m.set(String(e.id), e));
    return m;
  }, [empresas]);

  const nomeVendedorDaOs = (os: any) => {
    const cliente = os.cliente_id ? mapaClientes.get(String(os.cliente_id)) : null;
    if (!cliente) return "—";
    if (cliente.venda_propria) return "Próprio";
    const v = cliente.vendedor_id ? mapaVendedores.get(String(cliente.vendedor_id)) : null;
    return v ? v.apelido || v.nome : "—";
  };

  const statusUnicos = useMemo(
    () => Array.from(new Set(ordens.map((o: any) => String(o.status ?? "")).filter(Boolean))).sort(),
    [ordens],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const dias = PERIODOS[periodo] ?? null;
    const limite = dias ? Date.now() - dias * 86400000 : null;

    return ordens.filter((os: any) => {
      if (limite) {
        const base = new Date(os.data_abertura || os.criado_em || 0).getTime();
        if (!base || base < limite) return false;
      }
      if (status !== "todos" && String(os.status ?? "") !== status) return false;
      if (empresa !== "todas" && String(os.empresa_id ?? "") !== empresa) return false;
      if (vendedor !== "todos") {
        const cliente = os.cliente_id ? mapaClientes.get(String(os.cliente_id)) : null;
        if (vendedor === "proprio") {
          if (!cliente?.venda_propria) return false;
        } else if (String(cliente?.vendedor_id ?? "") !== vendedor) return false;
      }
      if (!termo) return true;
      return (
        String(os.numero_os ?? "").toLowerCase().includes(termo) ||
        String(os.cliente ?? "").toLowerCase().includes(termo)
      );
    });
  }, [ordens, busca, periodo, status, vendedor, empresa, mapaClientes]);

  const idsVisiveis = filtradas.map((o: any) => String(o.id));
  const selecionadosVisiveis = selecionados.filter((id) => idsVisiveis.includes(id));
  const todosSelecionados = idsVisiveis.length > 0 && selecionadosVisiveis.length === idsVisiveis.length;

  const totalValor = useMemo(() => {
    const alvo = selecionadosVisiveis.length > 0
      ? filtradas.filter((o: any) => selecionadosVisiveis.includes(String(o.id)))
      : filtradas;
    return alvo.reduce((s: number, o: any) => s + Number(o.valor_final || o.valor_total || 0), 0);
  }, [filtradas, selecionadosVisiveis]);

  const aplicarFiltrosSalvos = (f: any) => {
    setPeriodo(f.periodo ?? "todos");
    setStatus(f.status ?? "todos");
    setVendedor(f.vendedor ?? "todos");
    setEmpresa(f.empresa ?? "todas");
    setBusca(f.busca ?? "");
  };

  const limparFiltros = () => {
    setPeriodo("todos");
    setStatus("todos");
    setVendedor("todos");
    setEmpresa("todas");
    setBusca("");
  };

  const exportar = () => {
    const alvo = selecionadosVisiveis.length > 0
      ? filtradas.filter((o: any) => selecionadosVisiveis.includes(String(o.id)))
      : filtradas;
    if (alvo.length === 0) {
      toast.error("Nenhuma OS para exportar.");
      return;
    }
    exportToCSV(
      alvo.map((os: any) => {
        const base: Record<string, any> = {
          numero_os: os.numero_os ?? "",
          cliente: os.cliente ?? "",
          status: os.status ?? "",
          fase: ROTULO_FASE[faseDoStatus(os.status)] ?? "",
          vendedor: nomeVendedorDaOs(os),
          empresa: mapaEmpresas.get(String(os.empresa_id))?.nome ?? "",
          prioridade: os.prioridade ?? "",
          abertura: fmtData(os.data_abertura || os.criado_em),
          previsao: fmtData(os.data_previsao_conclusao),
          entrega: fmtData(os.data_entrega),
        };
        if (podeVerValores) base["valor"] = Number(os.valor_final || os.valor_total || 0);
        return base;
      }),
      "ordens-servico.csv",
    );
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.navigate({ to: "/dashboard" })}
            className="text-muted-foreground hover:text-primary"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">
              ORDENS DE <span className="text-primary">SERVIÇO</span>
            </h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
              Filtre por período, status, vendedor e empresa. Selecione e exporte.
            </p>
          </div>
        </div>
        <Button
          className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6"
          onClick={() => router.navigate({ to: "/os/nova" })}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova OS
        </Button>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Número da OS ou cliente..."
                className="pl-10 h-10 bg-white"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FiltrosSalvos
                lista="os"
                filtros={{ periodo, status, vendedor, empresa, busca }}
                onAplicar={aplicarFiltrosSalvos}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-[10px] font-bold uppercase"
                onClick={limparFiltros}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
              </Button>
              <RemoverSelecionados tabela="ordens_servico" ids={selecionadosVisiveis} rotulo="OS" onRemovidos={() => setSelecionados([])} />
              <Button
                variant="outline"
                size="sm"
                className="h-10 font-bold uppercase text-[10px] tracking-widest"
                onClick={exportar}
              >
                <Download className="mr-2 h-4 w-4" />
                {selecionadosVisiveis.length > 0 ? `Exportar (${selecionadosVisiveis.length})` : "Exportar"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-9 w-[170px] bg-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo o período</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[180px] bg-white text-xs font-bold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusUnicos.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger className="h-9 w-[190px] bg-white text-xs font-bold">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                <SelectItem value="proprio">Próprio (sem comissão)</SelectItem>
                {vendedores.map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.apelido || v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={empresa} onValueChange={setEmpresa}>
              <SelectTrigger className="h-9 w-[190px] bg-white text-xs font-bold">
                <SelectValue placeholder="Empresa emissora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {empresas.map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3 ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>{filtradas.length} OS</span>
              {podeVerValores && <span className="text-foreground">{brl(totalValor)}</span>}
              {selecionadosVisiveis.length > 0 && (
                <Badge className="bg-primary text-primary-foreground">{selecionadosVisiveis.length} selecionadas</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Selecionar todas as OS filtradas"
                    checked={todosSelecionados}
                    onCheckedChange={() => setSelecionados(todosSelecionados ? [] : idsVisiveis)}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Cliente</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Fase</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Vendedor</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Empresa</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Abertura</TableHead>
                {podeVerValores && (
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Valor</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={podeVerValores ? 8 : 7} className="py-10 text-center text-xs text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtradas.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={podeVerValores ? 8 : 7}
                    className="py-10 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    Nenhuma OS encontrada
                  </TableCell>
                </TableRow>
              )}
              {filtradas.map((os: any) => (
                <TableRow key={os.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Selecionar OS ${os.numero_os}`}
                      checked={selecionados.includes(String(os.id))}
                      onCheckedChange={() =>
                        setSelecionados((atual) =>
                          atual.includes(String(os.id))
                            ? atual.filter((i) => i !== String(os.id))
                            : [...atual, String(os.id)],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/os/$id"
                      params={{ id: String(os.id) }}
                      className="text-xs font-black uppercase hover:text-primary flex items-center gap-1"
                    >
                      <Wrench className="h-3.5 w-3.5 text-primary" />
                      {os.numero_os ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs font-semibold max-w-[220px] truncate">{os.cliente ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-black uppercase">
                      {ROTULO_FASE[faseDoStatus(os.status)] ?? os.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{nomeVendedorDaOs(os)}</TableCell>
                  <TableCell className="text-xs">{mapaEmpresas.get(String(os.empresa_id))?.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{fmtData(os.data_abertura || os.criado_em)}</TableCell>
                  {podeVerValores && (
                    <TableCell className="text-right text-xs font-bold">
                      {brl(Number(os.valor_final || os.valor_total || 0))}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
