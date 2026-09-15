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
import { ArrowLeft, Search, Download, Receipt, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos Financeiros — Alternativa Hidráulica" },
      {
        name: "description",
        content: "Lançamentos financeiros com filtros por período, tipo, fornecedor e cliente, com exportação.",
      },
      { property: "og:title", content: "Lançamentos Financeiros — Alternativa Hidráulica" },
      {
        property: "og:description",
        content: "Consulte, filtre, selecione e exporte os lançamentos financeiros da operação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListaLancamentos,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtData = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(String(v).length <= 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const PERIODOS: Record<string, number | null> = { todos: null, "30": 30, "90": 90, "180": 180, "365": 365 };

function ListaLancamentos() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState("90");
  const [tipo, setTipo] = useState("todos");
  const [fornecedor, setFornecedor] = useState("todos");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["lancamentos_lista"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lancamentos_financeiros")
        .select(
          "id, valor, data_competencia, descricao, tipo, os_id, fornecedor_id, cliente_id, criado_em, fornecedores ( nome ), clientes ( nome ), ordens_servico ( numero_os )",
        )
        .order("data_competencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const fornecedoresUnicos = useMemo(() => {
    const m = new Map<string, string>();
    lancamentos.forEach((l: any) => {
      if (l.fornecedor_id) m.set(String(l.fornecedor_id), l.fornecedores?.nome ?? "Fornecedor");
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [lancamentos]);

  const tiposUnicos = useMemo(
    () => Array.from(new Set(lancamentos.map((l: any) => String(l.tipo ?? "")).filter(Boolean))).sort(),
    [lancamentos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const dias = PERIODOS[periodo] ?? null;
    const limite = dias ? Date.now() - dias * 86400000 : null;
    return lancamentos.filter((l: any) => {
      if (limite) {
        const base = new Date(`${String(l.data_competencia ?? "").slice(0, 10)}T12:00:00`).getTime();
        if (!base || base < limite) return false;
      }
      if (tipo !== "todos" && String(l.tipo ?? "") !== tipo) return false;
      if (fornecedor !== "todos" && String(l.fornecedor_id ?? "") !== fornecedor) return false;
      if (!termo) return true;
      return (
        String(l.descricao ?? "").toLowerCase().includes(termo) ||
        String(l.fornecedores?.nome ?? "").toLowerCase().includes(termo) ||
        String(l.clientes?.nome ?? "").toLowerCase().includes(termo) ||
        String(l.ordens_servico?.numero_os ?? "").toLowerCase().includes(termo)
      );
    });
  }, [lancamentos, busca, periodo, tipo, fornecedor]);

  const idsVisiveis = filtrados.map((l: any) => String(l.id));
  const selecionadosVisiveis = selecionados.filter((id) => idsVisiveis.includes(id));
  const todosSelecionados = idsVisiveis.length > 0 && selecionadosVisiveis.length === idsVisiveis.length;

  const alvo = selecionadosVisiveis.length > 0
    ? filtrados.filter((l: any) => selecionadosVisiveis.includes(String(l.id)))
    : filtrados;

  const total = alvo.reduce((s: number, l: any) => s + Number(l.valor || 0), 0);

  const exportar = () => {
    if (alvo.length === 0) {
      toast.error("Nenhum lançamento para exportar.");
      return;
    }
    exportToCSV(
      alvo.map((l: any) => ({
        data_competencia: fmtData(l.data_competencia),
        tipo: l.tipo ?? "",
        descricao: l.descricao ?? "",
        fornecedor: l.fornecedores?.nome ?? "",
        cliente: l.clientes?.nome ?? "",
        os: l.ordens_servico?.numero_os ?? "",
        valor: Number(l.valor || 0),
      })),
      "lancamentos.csv",
    );
  };

  const aplicarFiltrosSalvos = (f: any) => {
    setPeriodo(f.periodo ?? "90");
    setTipo(f.tipo ?? "todos");
    setFornecedor(f.fornecedor ?? "todos");
    setBusca(f.busca ?? "");
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
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
            LANÇAMENTOS <span className="text-primary">FINANCEIROS</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Filtre por período, tipo e fornecedor. Selecione e exporte.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Descrição, fornecedor, cliente ou OS..."
                className="pl-10 h-10 bg-white"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FiltrosSalvos
                lista="lancamentos"
                filtros={{ periodo, tipo, fornecedor, busca }}
                onAplicar={aplicarFiltrosSalvos}
              />
              {selecionadosVisiveis.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-[10px] font-bold uppercase"
                  onClick={() => setSelecionados([])}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Limpar seleção
                </Button>
              )}
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
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-9 w-[170px] bg-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="todos">Todo o período</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-9 w-[170px] bg-white text-xs font-bold">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposUnicos.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fornecedor} onValueChange={setFornecedor}>
              <SelectTrigger className="h-9 w-[200px] bg-white text-xs font-bold">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os fornecedores</SelectItem>
                {fornecedoresUnicos.map(([id, nome]) => (
                  <SelectItem key={id} value={id}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3 ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>{filtrados.length} lançamentos</span>
              <span className="text-foreground text-sm">{brl(total)}</span>
              {selecionadosVisiveis.length > 0 && (
                <Badge className="bg-primary text-primary-foreground">{selecionadosVisiveis.length} selecionados</Badge>
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
                    aria-label="Selecionar todos os lançamentos filtrados"
                    checked={todosSelecionados}
                    onCheckedChange={() => setSelecionados(todosSelecionados ? [] : idsVisiveis)}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Competência</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Descrição</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipo</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Fornecedor</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">OS</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Selecionar lançamento ${l.descricao ?? ""}`}
                      checked={selecionados.includes(String(l.id))}
                      onCheckedChange={() =>
                        setSelecionados((atual) =>
                          atual.includes(String(l.id))
                            ? atual.filter((i) => i !== String(l.id))
                            : [...atual, String(l.id)],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{fmtData(l.data_competencia)}</TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate">
                    <span className="inline-flex items-center gap-1">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      {l.descricao ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-black uppercase">
                      {l.tipo ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.fornecedores?.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {l.os_id ? (
                      <Link to="/os/$id" params={{ id: String(l.os_id) }} className="font-bold hover:text-primary">
                        {l.ordens_servico?.numero_os ?? "Abrir OS"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold">{brl(Number(l.valor || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
