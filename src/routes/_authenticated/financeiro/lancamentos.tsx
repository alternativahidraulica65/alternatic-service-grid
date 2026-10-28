import { BotaoVoltar } from "@/components/BotaoVoltar";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { NovaDespesaDialog, BaixarDespesaDialog } from "@/components/NovaDespesaDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Landmark, Plus, Search, Wallet } from "lucide-react";
import { tetoDoRegime } from "@/lib/financeiro";

export const Route = createFileRoute("/_authenticated/financeiro/lancamentos")({
  head: () => ({
    meta: [
      { title: "Financeiro — Alternativa Hidráulica" },
      { name: "description", content: "Calendário de vencimentos, contas a pagar e a receber, saldos bancários e teto fiscal por CNPJ." },
      { property: "og:title", content: "Financeiro — Alternativa Hidráulica" },
      { property: "og:description", content: "Gestão financeira completa integrada às notas fiscais e às ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Financeiro,
});

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmt = (v?: string | null) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const venc = (l: any) => String(l.data_vencimento ?? l.data_competencia ?? "").slice(0, 10);
const somaIso = (iso: string, d: number) => { const x = new Date(`${iso}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const diasEntre = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);

function useFinanceiro() {
  return useQuery({
    queryKey: ["financeiro-completo"],
    queryFn: async () => {
      const sb = supabase as any;
      const umAno = new Date(Date.now() - 365 * 86400000).toISOString();
      const [lanc, contas, custos, notas, empresas] = await Promise.all([
        sb.from("lancamentos_financeiros")
          .select("id, tipo, categoria, valor, valor_pago, data_competencia, data_vencimento, data_pagamento, descricao, pago, cancelado, forma_pagamento, conta_bancaria_id, nota_fiscal_id, parcela, total_parcelas, os_id, cliente_id, fornecedor_id, fornecedores ( nome ), clientes ( nome ), ordens_servico ( numero_os )")
          .eq("cancelado", false).order("data_vencimento", { ascending: true }),
        sb.from("contas_bancarias").select("*").order("nome"),
        sb.from("os_custos").select("id, os_id, descricao, custo_interno, criado_em, fornecedor_id, terceiro_nome, fornecedores ( nome ), ordens_servico ( numero_os )")
          .eq("pago", false).gt("custo_interno", 0).neq("categoria", "mao_obra"),
        sb.from("notas_fiscais").select("id, empresa_id, valor_total, emitida_em, tipo, cfop").eq("status", "autorizada").eq("ambiente", "producao").gte("emitida_em", umAno),
        sb.from("empresas_emissoras").select("id, nome, cnpj, regime_tributario, aliquota_simples, ativo").eq("ativo", true),
      ]);
      for (const r of [lanc, contas, custos, notas, empresas]) if (r.error) throw r.error;
      return { lanc: lanc.data ?? [], contas: contas.data ?? [], custos: custos.data ?? [], notas: notas.data ?? [], empresas: empresas.data ?? [] };
    },
  });
}

function Financeiro() {
  const { data, isLoading, error } = useFinanceiro();
  const h = hoje();

  const r = useMemo(() => {
    const lanc = (data?.lanc ?? []) as any[];
    const abertos = lanc.filter((l) => !l.pago);
    const receber = abertos.filter((l) => l.tipo === "receita");
    const pagar = abertos.filter((l) => l.tipo !== "receita");
    const mes = h.slice(0, 7);
    const sum = (xs: any[], k = "valor") => xs.reduce((s, l) => s + Number(l[k] || 0), 0);
    const custosOs = sum(data?.custos ?? [], "custo_interno");
    const saldos = (data?.contas ?? []).map((c: any) => {
      const mov = lanc.filter((l) => l.pago && l.conta_bancaria_id === c.id && String(l.data_pagamento ?? "") >= c.data_saldo_inicial);
      const saldo = Number(c.saldo_inicial || 0) + sum(mov.filter((l) => l.tipo === "receita"), "valor_pago") - sum(mov.filter((l) => l.tipo !== "receita"), "valor_pago");
      return { ...c, saldo };
    });
    const saldoTotal = saldos.reduce((s: number, c: any) => s + c.saldo, 0);
    const receberMes = sum(receber.filter((l) => venc(l).startsWith(mes) || venc(l) < h));
    const pagarMes = sum(pagar.filter((l) => venc(l).startsWith(mes) || venc(l) < h));
    return {
      lanc, receber, pagar, saldos, saldoTotal, receberMes, pagarMes, custosOs,
      projetado: saldoTotal + receberMes - pagarMes - custosOs,
      vencidosRec: receber.filter((l) => venc(l) < h), hojeRec: receber.filter((l) => venc(l) === h),
      vencidosPag: pagar.filter((l) => venc(l) < h), hojePag: pagar.filter((l) => venc(l) === h),
      semana: abertos.filter((l) => venc(l) > h && venc(l) <= somaIso(h, 7)),
    };
  }, [data, h]);

  if (error) return <div className="p-6 text-destructive">Erro ao carregar o financeiro: {(error as Error).message}</div>;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight">Financeiro</h1>
            <p className="text-xs text-muted-foreground">Vencimentos, contas, saldos e teto fiscal — integrado às notas e OS.</p>
          </div>
        </div>
        <div className="flex gap-2"><NovaDespesaDialog tipo="receita" /><NovaDespesaDialog /></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi titulo="Saldo em contas" valor={r.saldoTotal} sub={`${r.saldos.length} conta(s)`} />
        <Kpi titulo="A receber no mês" valor={r.receberMes} sub={`${r.vencidosRec.length} vencido(s)`} tom="pos" />
        <Kpi titulo="A pagar no mês" valor={r.pagarMes} sub={`${r.vencidosPag.length} vencido(s)`} tom="neg" />
        <Kpi titulo="Custos de OS em aberto" valor={r.custosOs} sub="fornecedores a fechar" tom="neg" />
        <Kpi titulo="Saldo projetado" valor={r.projetado} sub="fim do mês" destaque />
      </div>

      <Tabs defaultValue="visao">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="visao">Mesa do dia & Calendário</TabsTrigger>
          <TabsTrigger value="receber">A receber ({r.receber.length})</TabsTrigger>
          <TabsTrigger value="pagar">A pagar ({r.pagar.length})</TabsTrigger>
          <TabsTrigger value="fiscal">Teto fiscal por CNPJ</TabsTrigger>
          <TabsTrigger value="contas">Contas bancárias</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                <Mesa titulo="Vencidos — cobrar / pagar" itens={[...r.vencidosRec, ...r.vencidosPag]} alerta />
                <Mesa titulo="Vence hoje" itens={[...r.hojeRec, ...r.hojePag]} alerta={r.hojeRec.length + r.hojePag.length > 0} />
                <Mesa titulo="Próximos 7 dias" itens={r.semana} />
              </div>
              <Calendario lanc={r.lanc} />
            </>
          )}
        </TabsContent>

        <TabsContent value="receber"><ListaContas itens={r.receber} tipo="receita" /></TabsContent>
        <TabsContent value="pagar" className="space-y-4">
          <ListaContas itens={r.pagar} tipo="despesa" />
          <CustosFornecedores custos={data?.custos ?? []} />
        </TabsContent>
        <TabsContent value="fiscal"><TetoFiscal empresas={data?.empresas ?? []} notas={data?.notas ?? []} /></TabsContent>
        <TabsContent value="contas"><ContasBancarias saldos={r.saldos} /></TabsContent>
        <TabsContent value="historico"><Historico lanc={r.lanc.filter((l) => l.pago)} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ titulo, valor, sub, tom, destaque }: { titulo: string; valor: number; sub: string; tom?: "pos" | "neg"; destaque?: boolean }) {
  return (
    <Card className={destaque ? "border-primary" : ""}>
      <CardContent className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{titulo}</p>
        <p className={`mt-1 text-xl font-black ${tom === "pos" ? "text-emerald-600" : tom === "neg" ? "text-destructive" : destaque && valor < 0 ? "text-destructive" : ""}`}>{brl(valor)}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function LinhaConta({ l }: { l: any }) {
  const h = hoje();
  const atraso = diasEntre(venc(l), h);
  const receita = l.tipo === "receita";
  return (
    <div className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{l.clientes?.nome || l.fornecedores?.nome || l.descricao}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {fmt(venc(l))} · {l.descricao}{l.ordens_servico?.numero_os ? ` · OS ${l.ordens_servico.numero_os}` : ""}
          {atraso > 0 && <span className="font-bold text-destructive"> · {atraso}d atraso</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-sm font-black ${receita ? "text-emerald-600" : "text-destructive"}`}>{receita ? "+" : "−"}{brl(Number(l.valor))}</span>
        <BaixarDespesaDialog lancamento={l} />
      </div>
    </div>
  );
}

function Mesa({ titulo, itens, alerta }: { titulo: string; itens: any[]; alerta?: boolean }) {
  return (
    <Card className={alerta && itens.length ? "border-l-4 border-l-primary" : ""}>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
        {alerta && itens.length > 0 && <AlertTriangle className="h-4 w-4 text-primary" />}{titulo} <Badge variant="secondary">{itens.length}</Badge>
      </CardTitle></CardHeader>
      <CardContent className="max-h-72 overflow-auto">
        {itens.length === 0 ? <p className="text-xs text-muted-foreground">Nada aqui.</p> : itens.map((l) => <LinhaConta key={l.id} l={l} />)}
      </CardContent>
    </Card>
  );
}

function Calendario({ lanc }: { lanc: any[] }) {
  const [ref, setRef] = useState(() => hoje().slice(0, 7));
  const [dia, setDia] = useState<string | null>(null);
  const [y = 2026, m = 1] = ref.split("-").map(Number);
  const primeiro = new Date(Date.UTC(y, m - 1, 1));
  const totalDias = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = primeiro.getUTCDay();
  const porDia = useMemo(() => {
    const mapa = new Map<string, any[]>();
    lanc.forEach((l) => { const d = l.pago ? String(l.data_pagamento ?? venc(l)).slice(0, 10) : venc(l); if (!d.startsWith(ref)) return; mapa.set(d, [...(mapa.get(d) ?? []), l]); });
    return mapa;
  }, [lanc, ref]);
  const mover = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setRef(d.toISOString().slice(0, 7)); setDia(null); };
  const h = hoje();
  const doDia = dia ? porDia.get(dia) ?? [] : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-black uppercase tracking-widest">Calendário de vencimentos</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => mover(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="w-36 text-center text-sm font-bold capitalize">{primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => mover(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="text-[10px] font-black uppercase text-muted-foreground">{d}</div>)}
          {Array.from({ length: offset }).map((_, i) => <div key={`v${i}`} />)}
          {Array.from({ length: totalDias }, (_, i) => {
            const iso = `${ref}-${String(i + 1).padStart(2, "0")}`;
            const itens = porDia.get(iso) ?? [];
            const ent = itens.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
            const sai = itens.filter((l) => l.tipo !== "receita").reduce((s, l) => s + Number(l.valor), 0);
            const atrasado = iso < h && itens.some((l) => !l.pago);
            return (
              <button key={iso} onClick={() => setDia(iso)}
                className={`min-h-16 rounded-sm border p-1 text-left text-[10px] transition hover:border-primary ${dia === iso ? "border-primary bg-primary/10" : ""} ${iso === h ? "ring-2 ring-primary" : ""} ${atrasado ? "bg-destructive/10" : ""}`}>
                <div className="font-bold">{i + 1}</div>
                {ent > 0 && <div className="truncate font-semibold text-emerald-600">+{brl(ent)}</div>}
                {sai > 0 && <div className="truncate font-semibold text-destructive">−{brl(sai)}</div>}
              </button>
            );
          })}
        </div>
        <div className="rounded-sm border p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest">{dia ? fmt(dia) : "Selecione um dia"}</p>
          {dia && doDia.length === 0 && <p className="text-xs text-muted-foreground">Sem movimentos.</p>}
          {doDia.map((l) => l.pago ? (
            <div key={l.id} className="flex justify-between border-b py-2 text-sm last:border-0">
              <span className="truncate">{l.descricao}</span><Badge variant="outline">{l.tipo === "receita" ? "Recebido" : "Pago"} {brl(Number(l.valor_pago ?? l.valor))}</Badge>
            </div>
          ) : <LinhaConta key={l.id} l={l} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function ListaContas({ itens, tipo }: { itens: any[]; tipo: "receita" | "despesa" }) {
  const [filtro, setFiltro] = useState<"todos" | "vencidos" | "hoje" | "semana" | "mes">("todos");
  const [busca, setBusca] = useState("");
  const h = hoje();
  const lista = itens.filter((l) => {
    const v = venc(l);
    if (filtro === "vencidos" && !(v < h)) return false;
    if (filtro === "hoje" && v !== h) return false;
    if (filtro === "semana" && !(v >= h && v <= somaIso(h, 7))) return false;
    if (filtro === "mes" && !v.startsWith(h.slice(0, 7))) return false;
    const t = busca.toLowerCase();
    return !t || [l.descricao, l.clientes?.nome, l.fornecedores?.nome, l.ordens_servico?.numero_os].some((x) => String(x ?? "").toLowerCase().includes(t));
  });
  const total = lista.reduce((s, l) => s + Number(l.valor || 0), 0);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["todos", "vencidos", "hoje", "semana", "mes"] as const).map((f) => (
            <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} className="h-8 text-[10px] font-bold uppercase" onClick={() => setFiltro(f)}>
              {{ todos: "Todos", vencidos: "Atrasados", hoje: "Hoje", semana: "7 dias", mes: "Este mês" }[f]}
            </Button>
          ))}
          <div className="relative ml-auto w-64"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Cliente, fornecedor, OS..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <Button size="sm" variant="outline" className="h-9" onClick={() => lista.length ? exportToCSV(lista.map((l) => ({ Vencimento: fmt(venc(l)), Descricao: l.descricao, Parte: l.clientes?.nome || l.fornecedores?.nome || "", OS: l.ordens_servico?.numero_os || "", Valor: Number(l.valor) })), tipo === "receita" ? "a_receber" : "a_pagar") : toast.error("Nada para exportar.")}>
            <Download className="mr-1 h-4 w-4" /> CSV</Button>
        </div>
        <p className="text-sm font-bold">{lista.length} título(s) · <span className={tipo === "receita" ? "text-emerald-600" : "text-destructive"}>{brl(total)}</span></p>
        <Table>
          <TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>{tipo === "receita" ? "Cliente" : "Fornecedor"}</TableHead><TableHead>Descrição</TableHead><TableHead>OS</TableHead><TableHead className="text-right">Valor</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum título em aberto.</TableCell></TableRow>}
            {lista.map((l) => {
              const atraso = diasEntre(venc(l), h);
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{fmt(venc(l))}{atraso > 0 && <Badge variant="destructive" className="ml-2">{atraso}d</Badge>}</TableCell>
                  <TableCell>{l.clientes?.nome || l.fornecedores?.nome || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{l.descricao}{l.nota_fiscal_id && <Badge variant="outline" className="ml-2">NF</Badge>}</TableCell>
                  <TableCell>{l.os_id ? <Link to="/os/$id" params={{ id: l.os_id }} className="font-semibold underline">{l.ordens_servico?.numero_os}</Link> : "—"}</TableCell>
                  <TableCell className="text-right font-bold">{brl(Number(l.valor))}</TableCell>
                  <TableCell className="text-right"><BaixarDespesaDialog lancamento={l} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CustosFornecedores({ custos }: { custos: any[] }) {
  const qc = useQueryClient();
  const grupos = useMemo(() => {
    const m = new Map<string, { nome: string; total: number; ids: string[]; itens: any[] }>();
    custos.forEach((c) => {
      const k = c.fornecedor_id || `t:${c.terceiro_nome || "sem"}`;
      const g = m.get(k) ?? { nome: c.fornecedores?.nome || c.terceiro_nome || "Sem fornecedor", total: 0, ids: [], itens: [] };
      g.total += Number(c.custo_interno || 0); g.ids.push(c.id); g.itens.push(c); m.set(k, g);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [custos]);

  async function quitar(g: { nome: string; ids: string[]; total: number }) {
    if (!confirm(`Confirmar pagamento de ${brl(g.total)} para ${g.nome}?`)) return;
    const { error } = await (supabase as any).from("os_custos").update({ pago: true, data_pagamento: hoje() }).in("id", g.ids);
    if (error) { toast.error(error.message); return; }
    toast.success("Fechamento do fornecedor quitado.");
    qc.invalidateQueries({ queryKey: ["financeiro-completo"] });
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase tracking-widest">Custos de OS em aberto por fornecedor (fechamento)</CardTitle></CardHeader>
      <CardContent>
        {grupos.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum custo de OS pendente.</p> : grupos.map((g) => (
          <details key={g.nome} className="border-b py-2 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className="text-sm font-semibold">{g.nome} <span className="text-xs text-muted-foreground">({g.itens.length} item(ns))</span></span>
              <span className="flex items-center gap-2"><span className="font-black text-destructive">{brl(g.total)}</span>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase" onClick={(e) => { e.preventDefault(); quitar(g); }}>Quitar</Button></span>
            </summary>
            <ul className="mt-2 space-y-1 pl-3 text-xs text-muted-foreground">
              {g.itens.map((c) => <li key={c.id}>OS {c.ordens_servico?.numero_os} · {c.descricao} · {brl(Number(c.custo_interno))}</li>)}
            </ul>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function TetoFiscal({ empresas, notas }: { empresas: any[]; notas: any[] }) {
  const ano = hoje().slice(0, 4);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {empresas.map((e) => {
        const fat = notas.filter((n) => n.empresa_id === e.id && !(n.tipo === "nfe" && ["5916", "6916"].includes(n.cfop)));
        const rbt12 = fat.reduce((s, n) => s + Number(n.valor_total || 0), 0);
        const noAno = fat.filter((n) => String(n.emitida_em).startsWith(ano)).reduce((s, n) => s + Number(n.valor_total || 0), 0);
        const noMes = fat.filter((n) => String(n.emitida_em).startsWith(hoje().slice(0, 7))).reduce((s, n) => s + Number(n.valor_total || 0), 0);
        const { teto, rotulo } = tetoDoRegime(e.regime_tributario);
        const pct = Math.min((noAno / teto) * 100, 100);
        return (
          <Card key={e.id} className={pct >= 80 ? "border-l-4 border-l-primary" : ""}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm font-black uppercase">
              <span>{e.nome}</span><Badge variant="outline">Teto {rotulo}: {brl(teto)}</Badge></CardTitle>
              <p className="text-[11px] text-muted-foreground">CNPJ {e.cnpj}</p></CardHeader>
            <CardContent className="space-y-3">
              <div><div className="mb-1 flex justify-between text-xs font-bold"><span>Emitido em {ano}</span><span>{pct.toFixed(1)}%</span></div><Progress value={pct} /></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] uppercase text-muted-foreground">No mês</p><p className="font-black">{brl(noMes)}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">No ano</p><p className="font-black">{brl(noAno)}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Últimos 12m</p><p className="font-black">{brl(rbt12)}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Disponível até o teto: <b>{brl(Math.max(teto - noAno, 0))}</b> · DAS estimado no mês ({Number(e.aliquota_simples || 0)}%): <b>{brl(noMes * Number(e.aliquota_simples || 0) / 100)}</b></p>
              {pct >= 80 && <p className="flex items-center gap-1 text-xs font-bold text-primary"><AlertTriangle className="h-4 w-4" /> Perto do teto — direcione as próximas notas para outro CNPJ.</p>}
            </CardContent>
          </Card>
        );
      })}
      <p className="text-xs text-muted-foreground md:col-span-2">Considera apenas notas autorizadas em produção. Notas de teste e de retorno de conserto não somam faturamento.</p>
    </div>
  );
}

function ContasBancarias({ saldos }: { saldos: any[] }) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: "", banco: "", agencia: "", conta: "", saldo: "", data: hoje() });
  async function salvar() {
    if (!f.nome.trim()) { toast.error("Informe o nome da conta."); return; }
    const { error } = await (supabase as any).from("contas_bancarias").insert({
      nome: f.nome.trim(), banco: f.banco || null, agencia: f.agencia || null, conta: f.conta || null,
      saldo_inicial: Number(f.saldo.replace(/\./g, "").replace(",", ".")) || 0, data_saldo_inicial: f.data,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Conta cadastrada."); setAberto(false); setF({ ...f, nome: "", saldo: "" });
    qc.invalidateQueries({ queryKey: ["financeiro-completo"] }); qc.invalidateQueries({ queryKey: ["contas_bancarias_select"] });
  }
  return (
    <div className="space-y-3">
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogTrigger asChild><Button size="sm" className="h-10 text-[10px] font-bold uppercase"><Plus className="mr-1 h-4 w-4" /> Nova conta / caixa</Button></DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova conta bancária ou caixa</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Itaú PJ, Caixa da oficina" /></div>
            <div><Label>Banco</Label><Input value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} /></div>
            <div><Label>Agência</Label><Input value={f.agencia} onChange={(e) => setF({ ...f, agencia: e.target.value })} /></div>
            <div><Label>Conta</Label><Input value={f.conta} onChange={(e) => setF({ ...f, conta: e.target.value })} /></div>
            <div><Label>Saldo inicial (R$)</Label><Input inputMode="decimal" value={f.saldo} onChange={(e) => setF({ ...f, saldo: e.target.value })} placeholder="0,00" /></div>
            <div className="col-span-2"><Label>Data do saldo inicial</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={salvar}>Salvar conta</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="grid gap-3 md:grid-cols-3">
        {saldos.length === 0 && <p className="text-sm text-muted-foreground">Cadastre suas contas para acompanhar o saldo real. As baixas passam a movimentar a conta escolhida.</p>}
        {saldos.map((c) => (
          <Card key={c.id}><CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm font-black uppercase">{c.banco ? <Landmark className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}{c.nome}</p>
            <p className="text-[11px] text-muted-foreground">{[c.banco, c.agencia && `Ag ${c.agencia}`, c.conta && `CC ${c.conta}`].filter(Boolean).join(" · ") || "Caixa"}</p>
            <p className={`mt-2 text-2xl font-black ${c.saldo < 0 ? "text-destructive" : ""}`}>{brl(c.saldo)}</p>
            <p className="text-[11px] text-muted-foreground">Saldo inicial {brl(Number(c.saldo_inicial))} em {fmt(c.data_saldo_inicial)}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function Historico({ lanc }: { lanc: any[] }) {
  const lista = [...lanc].sort((a, b) => String(b.data_pagamento).localeCompare(String(a.data_pagamento))).slice(0, 300);
  return (
    <Card><CardContent className="p-4">
      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
        <TableBody>
          {lista.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhuma baixa registrada.</TableCell></TableRow>}
          {lista.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{fmt(l.data_pagamento)}</TableCell>
              <TableCell>{l.descricao}</TableCell>
              <TableCell>{l.forma_pagamento || "—"}</TableCell>
              <TableCell className={`text-right font-bold ${l.tipo === "receita" ? "text-emerald-600" : "text-destructive"}`}>{l.tipo === "receita" ? "+" : "−"}{brl(Number(l.valor_pago ?? l.valor))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
