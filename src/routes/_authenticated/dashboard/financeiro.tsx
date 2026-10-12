import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, Wrench, Wallet, Truck, Handshake, FileSpreadsheet, Printer, Receipt, Users, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { AlertaOrcamentosCard } from "@/components/AlertaOrcamentosCard";
import { AlertaAprovacoesCard } from "@/components/AlertaAprovacoesCard";
import { LembretesCard } from "@/components/LembretesCard";

export const Route = createFileRoute("/_authenticated/dashboard/financeiro")({
  head: () => ({ meta: [
    { title: "Painel financeiro — Alternativa Hidráulica" },
    { name: "description", content: "Faturamento, lucro real, contas a pagar, cobranças e comissões do mês." },
    { property: "og:title", content: "Painel financeiro — Alternativa Hidráulica" },
    { property: "og:description", content: "Faturamento, lucro real, contas a pagar, cobranças e comissões do mês." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DashboardFinanceiro,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const dia = (d: Date) => format(d, "yyyy-MM-dd");
const ESTADOS_PIPELINE = ["orcamento_pendente", "orcamento", "aguardando_aprovacao"];

type OsRow = {
  id: string; numero_os: string; cliente: string; status: string; valor_total: number | null; valor_final: number | null;
  imposto_aplicado: number | null; comissao_calculada: number | null; data_entrega: string | null; status_financeiro: string | null;
  orcamento_enviado_em: string | null; orcamento_resposta?: string | null; updated_at: string | null;
  clientes?: { vendedor_id: string | null; vendedores?: { nome: string } | null } | null;
};

const valorOs = (o: OsRow) => Number(o.valor_final ?? o.valor_total ?? 0);
const impostoOs = (o: OsRow) => {
  const t = Number(o.imposto_aplicado ?? 0);
  return t > 0 && t <= 100 ? (valorOs(o) * t) / 100 : t;
};

async function custosPorOs(ids: string[]) {
  const mapa = new Map<string, number>();
  if (!ids.length) return mapa;
  const { data, error } = await supabase.from("os_custos").select("os_id, custo_interno").in("os_id", ids);
  if (error) throw error;
  (data || []).forEach((c) => mapa.set(c.os_id, (mapa.get(c.os_id) || 0) + Number(c.custo_interno || 0)));
  return mapa;
}

/** Despesas avulsas pagas (baixadas) no período — entram no DRE. */
async function despesasPagas(ini: Date, fimP: Date) {
  const { data, error } = await (supabase as any)
    .from("lancamentos_financeiros")
    .select("valor, valor_pago, data_pagamento, tipo")
    .eq("pago", true)
    .gte("data_pagamento", dia(ini))
    .lte("data_pagamento", dia(fimP));
  if (error) throw error;
  return ((data || []) as any[]).filter((l) => String(l.tipo ?? "").toLowerCase() !== "receita");
}
const somaDespesas = (l: any[]) => l.reduce((a, x) => a + Number(x.valor_pago ?? x.valor ?? 0), 0);

function dre(oss: OsRow[], custos: Map<string, number>, despesas = 0) {
  const receita = oss.reduce((a, o) => a + valorOs(o), 0);
  const custo = oss.reduce((a, o) => a + (custos.get(o.id) || 0), 0);
  const impostos = oss.reduce((a, o) => a + impostoOs(o), 0);
  const comissoes = oss.reduce((a, o) => a + Number(o.comissao_calculada || 0), 0);
  const lucro = receita - custo - impostos - comissoes - despesas;
  return { receita, custo, impostos, comissoes, despesas, lucro, margem: receita > 0 ? (lucro / receita) * 100 : null };
}

const SELECT_OS = "id, numero_os, cliente, status, valor_total, valor_final, imposto_aplicado, comissao_calculada, data_entrega, status_financeiro, orcamento_enviado_em, updated_at, clientes(vendedor_id, vendedores(nome))";

function DashboardFinanceiro() {
  const { podeVerValoresFinanceiros } = useUserRole();
  const hoje = new Date();
  const [mes, setMes] = useState(String(hoje.getMonth()));
  const [ano, setAno] = useState(String(hoje.getFullYear()));
  const inicio = new Date(Number(ano), Number(mes), 1);
  const fim = endOfMonth(inicio);
  const inicioAnt = startOfMonth(subMonths(inicio, 1));
  const fimAnt = endOfMonth(inicioAnt);

  const { data, isLoading } = useQuery({
    enabled: podeVerValoresFinanceiros,
    queryKey: ["fin-dashboard-v2", dia(inicio)],
    queryFn: async () => {
      const [entregues, entreguesAnt, pipeline, prontas, pendentes] = await Promise.all([
        supabase.from("ordens_servico").select(SELECT_OS).eq("status", "entregue").gte("data_entrega", inicio.toISOString()).lte("data_entrega", fim.toISOString()),
        supabase.from("ordens_servico").select(SELECT_OS).eq("status", "entregue").gte("data_entrega", inicioAnt.toISOString()).lte("data_entrega", fimAnt.toISOString()),
        supabase.from("ordens_servico").select("id, numero_os, cliente, valor_final, valor_total, orcamento_enviado_em").in("status", ESTADOS_PIPELINE).not("orcamento_enviado_em", "is", null),
        supabase.from("ordens_servico").select(SELECT_OS).eq("status", "pronto").order("updated_at", { ascending: true }),
        supabase.from("os_custos").select("id, custo_interno, fornecedor_id, terceiro_nome, criado_em, fornecedores(nome)").eq("pago", false).lte("criado_em", fim.toISOString()),
      ]);
      for (const r of [entregues, entreguesAnt, pipeline, prontas, pendentes]) if (r.error) throw r.error;
      const ent = (entregues.data || []) as unknown as OsRow[];
      const ant = (entreguesAnt.data || []) as unknown as OsRow[];
      const [cAtual, cAnt] = await Promise.all([custosPorOs(ent.map((o) => o.id)), custosPorOs(ant.map((o) => o.id))]);

      const passivoMap = new Map<string, { nome: string; total: number; itens: number }>();
      (pendentes.data || []).forEach((c: any) => {
        const nome = c.fornecedores?.nome || c.terceiro_nome || "Sem fornecedor";
        const k = c.fornecedor_id || nome;
        const cur = passivoMap.get(k) || { nome, total: 0, itens: 0 };
        cur.total += Number(c.custo_interno || 0); cur.itens += 1;
        passivoMap.set(k, cur);
      });
      const passivo = [...passivoMap.values()].filter((p) => p.total > 0).sort((a, b) => b.total - a.total);

      const comMap = new Map<string, { nome: string; vendas: number; base: number; comissao: number }>();
      ent.forEach((o) => {
        const nome = o.clientes?.vendedores?.nome;
        if (!nome) return;
        const cur = comMap.get(nome) || { nome, vendas: 0, base: 0, comissao: 0 };
        cur.vendas += 1; cur.base += valorOs(o); cur.comissao += Number(o.comissao_calculada || 0);
        comMap.set(nome, cur);
      });

      const pip = pipeline.data || [];
      return {
        atual: dre(ent, cAtual),
        anterior: dre(ant, cAnt),
        passivo,
        passivoTotal: passivo.reduce((a, p) => a + p.total, 0),
        pipelineTotal: pip.reduce((a, o: any) => a + Number(o.valor_final ?? o.valor_total ?? 0), 0),
        pipelineQtd: pip.length,
        prontas: (prontas.data || []) as unknown as OsRow[],
        entregues: ent,
        comissoes: [...comMap.values()].sort((a, b) => b.comissao - a.comissao),
      };
    },
  });

  const { data: tendencia } = useQuery({
    enabled: podeVerValoresFinanceiros,
    queryKey: ["fin-tendencia-v2", dia(inicio)],
    queryFn: async () => {
      const ini = startOfMonth(subMonths(inicio, 5));
      const { data: os, error } = await supabase.from("ordens_servico").select(SELECT_OS).eq("status", "entregue").gte("data_entrega", ini.toISOString()).lte("data_entrega", fim.toISOString());
      if (error) throw error;
      const lista = (os || []) as unknown as OsRow[];
      const custos = await custosPorOs(lista.map((o) => o.id));
      return Array.from({ length: 6 }, (_, i) => {
        const m = subMonths(inicio, 5 - i);
        const chave = format(m, "yyyy-MM");
        const r = dre(lista.filter((o) => o.data_entrega?.startsWith(chave)), custos);
        return { mes: format(m, "MMM", { locale: ptBR }), receita: r.receita, custos: r.custo + r.impostos + r.comissoes, lucro: r.lucro };
      });
    },
  });

  if (!podeVerValoresFinanceiros) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-destructive uppercase">Acesso negado</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para acessar o painel financeiro.</p>
      </div>
    );
  }

  const exportarCSV = () => {
    if (!data) return;
    const linhas = [
      ["Indicador", "Valor"],
      ["Faturamento", data.atual.receita.toFixed(2)],
      ["Custos diretos", data.atual.custo.toFixed(2)],
      ["Impostos", data.atual.impostos.toFixed(2)],
      ["Comissões", data.atual.comissoes.toFixed(2)],
      ["Lucro líquido", data.atual.lucro.toFixed(2)],
      ["A pagar (valinhos)", data.passivoTotal.toFixed(2)],
      ["Em negociação", data.pipelineTotal.toFixed(2)],
      [],
      ["OS entregue", "Cliente", "Valor"],
      ...data.entregues.map((o) => [o.numero_os, o.cliente, valorOs(o).toFixed(2)]),
    ];
    const blob = new Blob(["\uFEFF" + linhas.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `financeiro_${Number(mes) + 1}_${ano}.csv`;
    a.click();
  };

  const variacao = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

  return (
    <div className="space-y-6 p-4 md:p-8 print:p-0">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Painel financeiro</p>
          <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Fechamento de {MESES[Number(mes)]} <span className="text-primary">{ano}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="h-9 w-[140px] text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="h-9 w-[100px] text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{[0, 1, 2].map((d) => String(hoje.getFullYear() - d)).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9" onClick={exportarCSV}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Planilha</Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Imprimir</Button>
        </div>
      </div>

      {/* Alertas mantidos */}
      <div className="grid gap-4 lg:grid-cols-3 print:hidden">
        <AlertaAprovacoesCard />
        <AlertaOrcamentosCard />
        <LembretesCard />
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi titulo="Faturamento realizado" icone={TrendingUp} carregando={isLoading} valor={brl(data?.atual.receita || 0)}
          sub="OS entregues no mês" delta={data ? variacao(data.atual.receita, data.anterior.receita) : null} />
        <Kpi titulo="Custos diretos" icone={Wrench} carregando={isLoading} valor={brl(data?.atual.custo || 0)}
          sub={`+ impostos ${brl(data?.atual.impostos || 0)}`} delta={data ? variacao(data.atual.custo, data.anterior.custo) : null} inverso />
        <Kpi titulo="Lucro líquido real" icone={Wallet} destaque carregando={isLoading} valor={brl(data?.atual.lucro || 0)}
          sub={data?.atual.margem != null ? `Margem ${data.atual.margem.toFixed(1)}%` : "Sem entregas no mês"} delta={data ? variacao(data.atual.lucro, data.anterior.lucro) : null} />
        <Kpi titulo="A pagar (valinhos)" icone={Truck} carregando={isLoading} valor={brl(data?.passivoTotal || 0)}
          sub={`${data?.passivo.length || 0} fornecedores em aberto`} />
        <Kpi titulo="Em negociação" icone={Handshake} carregando={isLoading} valor={brl(data?.pipelineTotal || 0)}
          sub={`${data?.pipelineQtd || 0} propostas com o cliente`} />
      </div>

      {/* DRE + gráfico */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Resultado dos últimos 6 meses</CardTitle>
            <CardDescription>Faturamento, custos totais (peças, terceiros, impostos e comissões) e lucro líquido.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-[280px] w-full" config={{
              receita: { label: "Faturamento", color: "var(--primary)" },
              custos: { label: "Custos", color: "var(--muted-foreground)" },
              lucro: { label: "Lucro", color: "var(--foreground)" },
            }}>
              <BarChart data={tendencia || []}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v: unknown) => brl(Number(v))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="receita" fill="var(--color-receita)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="custos" fill="var(--color-custos)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lucro" fill="var(--color-lucro)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Demonstrativo do mês</CardTitle>
            <CardDescription>Como o faturamento vira lucro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <>
                <LinhaDre rotulo="Faturamento" valor={data?.atual.receita || 0} forte />
                <LinhaDre rotulo="(−) Peças e terceiros" valor={-(data?.atual.custo || 0)} />
                <LinhaDre rotulo="(−) Impostos" valor={-(data?.atual.impostos || 0)} />
                <LinhaDre rotulo="(−) Comissões" valor={-(data?.atual.comissoes || 0)} />
                <div className="mt-2 flex items-center justify-between rounded-md bg-primary px-3 py-3 text-primary-foreground">
                  <span className="text-xs font-black uppercase tracking-wider">Lucro líquido</span>
                  <span className="text-lg font-black">{brl(data?.atual.lucro || 0)}</span>
                </div>
                <p className="pt-1 text-right text-xs text-muted-foreground">
                  Margem real: <strong className="text-foreground">{data?.atual.margem != null ? `${data.atual.margem.toFixed(1)}%` : "—"}</strong>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mesas operacionais */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Mesa titulo="Prontas para cobrança" descricao="OS finalizadas na oficina, aguardando entrega e cobrança." icone={Receipt}
          vazio="Nenhuma OS pronta no momento." carregando={isLoading} total={data ? brl(data.prontas.reduce((a, o) => a + valorOs(o), 0)) : undefined}>
          {data?.prontas.slice(0, 8).map((o) => (
            <Link key={o.id} to="/os/$id" params={{ id: o.id }} className="flex items-center justify-between gap-2 py-2.5 hover:bg-muted/50 px-1 rounded-sm">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{o.numero_os}</p>
                <p className="text-xs text-muted-foreground truncate">{o.cliente}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">{brl(valorOs(o))}</p>
                <Badge variant="outline" className="text-[10px]">{o.status_financeiro || "A cobrar"}</Badge>
              </div>
            </Link>
          ))}
        </Mesa>

        <Mesa titulo="Quitação de parceiros" descricao="Valores lançados e ainda não pagos, por fornecedor." icone={Truck}
          vazio="Nenhum valor pendente." carregando={isLoading} total={data ? brl(data.passivoTotal) : undefined}
          acao={<Button asChild size="sm" className="w-full"><Link to="/financeiro/valinhos">Abrir valinhos e quitar</Link></Button>}>
          {data?.passivo.slice(0, 8).map((p) => (
            <div key={p.nome} className="flex items-center justify-between gap-2 py-2.5 px-1">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.itens} {p.itens === 1 ? "lançamento" : "lançamentos"}</p>
              </div>
              <p className="text-sm font-bold shrink-0">{brl(p.total)}</p>
            </div>
          ))}
        </Mesa>

        <Mesa titulo="Comissões do mês" descricao="Sobre OS entregues de clientes com vendedor." icone={Users}
          vazio="Nenhuma comissão no período." carregando={isLoading} total={data ? brl(data.comissoes.reduce((a, c) => a + c.comissao, 0)) : undefined}>
          {data?.comissoes.map((c) => (
            <div key={c.nome} className="flex items-center justify-between gap-2 py-2.5 px-1">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.vendas} {c.vendas === 1 ? "venda" : "vendas"} · base {brl(c.base)}</p>
              </div>
              <p className="text-sm font-bold shrink-0">{brl(c.comissao)}</p>
            </div>
          ))}
        </Mesa>
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, sub, icone: Icone, delta, inverso, destaque, carregando }: {
  titulo: string; valor: string; sub: string; icone: typeof TrendingUp; delta?: number | null; inverso?: boolean; destaque?: boolean; carregando?: boolean;
}) {
  const bom = delta != null && (inverso ? delta <= 0 : delta >= 0);
  return (
    <Card className={destaque ? "border-primary bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{titulo}</p>
          <Icone className={`h-4 w-4 ${destaque ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        {carregando ? <Skeleton className="mt-2 h-8 w-32" /> : <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{valor}</p>}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {delta != null && (
            <span className={`inline-flex items-center font-bold ${bom ? "text-foreground" : "text-destructive"}`}>
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
          <span className="truncate">{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function LinhaDre({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <span className={forte ? "font-bold" : "text-muted-foreground"}>{rotulo}</span>
      <span className={`font-semibold tabular-nums ${valor < 0 ? "text-destructive" : ""}`}>{brl(valor)}</span>
    </div>
  );
}

function Mesa({ titulo, descricao, icone: Icone, children, vazio, carregando, total, acao }: {
  titulo: string; descricao: string; icone: typeof TrendingUp; children?: React.ReactNode; vazio: string; carregando?: boolean | undefined; total?: string | undefined; acao?: React.ReactNode;
}) {
  const itens = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Icone className="h-4 w-4 text-primary" />{titulo}</CardTitle>
            <CardDescription className="mt-1">{descricao}</CardDescription>
          </div>
          {total && <span className="text-sm font-black whitespace-nowrap">{total}</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {carregando ? <Skeleton className="h-40 w-full" /> : itens.length ? <div className="divide-y divide-border">{children}</div> : (
          <p className="py-8 text-center text-xs font-medium text-muted-foreground">{vazio}</p>
        )}
        {acao && <div className="mt-auto pt-3">{acao}</div>}
      </CardContent>
    </Card>
  );
}
