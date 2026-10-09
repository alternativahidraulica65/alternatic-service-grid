import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calculator, CheckCircle2, Circle, Layers, Save, Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { idCustoAutomatico } from "@/lib/custos-automaticos";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/engenharia/materiais")({
  head: () => ({
    meta: [
      { title: "Matéria-prima por OS | Alternativa Hidráulica" },
      { name: "description", content: "Calcule peso e custo de matéria-prima das peças refeitas e lance direto na OS." },
      { property: "og:title", content: "Matéria-prima por OS | Alternativa Hidráulica" },
      { property: "og:description", content: "Calculadora de barras e tubos ligada aos subserviços da oficina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MateriaisPage,
});

/** Densidades físicas de referência (g/cm³). Preço vem do cadastro. */
const PADROES = [
  { nome: "Aço SAE 1045", densidade: 7.85 },
  { nome: "Aço SAE 4140 beneficiado", densidade: 7.85 },
  { nome: "Tubo brunido ST-52", densidade: 7.85 },
  { nome: "Aço inox 304", densidade: 7.93 },
  { nome: "Bronze TM-23", densidade: 8.8 },
  { nome: "Ferro fundido nodular", densidade: 7.2 },
  { nome: "Nylon", densidade: 1.15 },
  { nome: "Poliacetal (POM)", densidade: 1.42 },
  { nome: "PTFE / Teflon", densidade: 2.2 },
];

const PALAVRAS = ["haste", "tubo", "camisa", "embolo", "êmbolo", "porca", "bucha", "pino", "eixo", "flange", "tampa", "guia", "cabe", "olhal", "pistão", "pistao"];

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const num = (v: number, d = 2) => (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Aceita 3.1/2", 3 1/2", 2", 1.3/4 pol, 50,8mm ou 50.8 (mm). Retorna mm. */
export function medidaParaMm(entrada: string): number {
  const t = String(entrada ?? "").trim().toLowerCase().replace(",", ".");
  if (!t) return 0;
  const polegada = /["”]|pol|\//.test(t);
  const limpo = t.replace(/["”]|pol|mm/g, "").trim();
  if (!polegada) return Number(limpo) || 0;
  const m = limpo.match(/^(\d+)?[.\s-]?(\d+)\/(\d+)$/);
  let pol = 0;
  if (m) pol = Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  else pol = Number(limpo) || 0;
  return pol * 25.4;
}

const ehMaterial = (s: any) => {
  const t = `${s.componente ?? ""} ${s.descricao ?? ""}`.toLowerCase();
  return PALAVRAS.some((p) => t.includes(p));
};

function MateriaisPage() {
  const qc = useQueryClient();
  const { isDiretor, isFinanceiro, isGestor, isDev } = useUserRole();
  const podeLancar = isDiretor || isFinanceiro || isGestor || isDev;
  const podeEditarPreco = isDiretor || isFinanceiro || isDev;

  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState(false);
  const [sel, setSel] = useState<any | null>(null);

  const [geometria, setGeometria] = useState<"barra" | "tubo">("barra");
  const [dExt, setDExt] = useState("3.1/2\"");
  const [dInt, setDInt] = useState("");
  const [comp, setComp] = useState("500");
  const [sobra, setSobra] = useState("15");
  const [qtd, setQtd] = useState("1");
  const [material, setMaterial] = useState(PADROES[0]!.nome);
  const [modoPreco, setModoPreco] = useState<"kg" | "metro">("kg");
  const [preco, setPreco] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: materiaisDb = [] } = useQuery({
    queryKey: ["materias_primas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materias_primas" as any).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const materiais = useMemo(() => {
    const m = new Map<string, { id?: string; nome: string; densidade: number; preco: number }>();
    PADROES.forEach((p) => m.set(p.nome.toLowerCase(), { ...p, preco: 0 }));
    materiaisDb.forEach((r: any) =>
      m.set(String(r.nome).toLowerCase(), { id: r.id, nome: r.nome, densidade: Number(r.densidade) || 7.85, preco: Number(r.preco_base_kg) || 0 }),
    );
    return Array.from(m.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [materiaisDb]);
  const mat = materiais.find((m) => m.nome === material) ?? materiais[0]!;

  const { data: fila = [] } = useQuery({
    queryKey: ["materiais_fila"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_subservicos" as any)
        .select("id, os_id, componente, descricao, status, ordens_servico ( numero_os, cliente, status )")
        .neq("status", "concluido")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const lista = (data ?? []) as any[];
      const ids = await Promise.all(lista.map((s) => idCustoAutomatico(s.os_id, s.id, "materia-prima")));
      const lancados = new Map<string, number>();
      for (let i = 0; i < ids.length; i += 100) {
        const { data: c } = await supabase.from("os_custos" as any).select("id, custo_interno").in("id", ids.slice(i, i + 100));
        (c ?? []).forEach((x: any) => lancados.set(x.id, Number(x.custo_interno) || 0));
      }
      return lista
        .filter((s) => !["entregue", "cancelada", "encerrado"].includes(String(s.ordens_servico?.status ?? "")))
        .map((s, i) => ({ ...s, custoId: ids[i], lancado: lancados.has(ids[i]!), valorLancado: lancados.get(ids[i]!) ?? 0 }));
    },
  });

  const visiveis = fila.filter((s: any) => {
    if (!todos && !ehMaterial(s)) return false;
    const t = `${s.ordens_servico?.numero_os ?? ""} ${s.ordens_servico?.cliente ?? ""} ${s.componente ?? ""} ${s.descricao ?? ""}`.toLowerCase();
    return t.includes(busca.toLowerCase());
  });
  const pendentes = visiveis.filter((s: any) => !s.lancado).length;

  const calc = useMemo(() => {
    const de = medidaParaMm(dExt);
    const di = geometria === "tubo" ? medidaParaMm(dInt) : 0;
    const L = (Number(comp.replace(",", ".")) || 0) + (Number(sobra.replace(",", ".")) || 0);
    const q = Math.max(1, Number(qtd) || 1);
    const area = (Math.PI / 4) * (de * de - di * di); // mm²
    const volCm3 = (area * L) / 1000;
    const pesoUn = (volCm3 * mat.densidade) / 1000;
    const p = Number(preco.replace(",", ".")) || 0;
    const custoUn = modoPreco === "kg" ? pesoUn * p : (L / 1000) * p;
    return { de, di, L, q, pesoUn, pesoTotal: pesoUn * q, custoTotal: custoUn * q, valido: de > 0 && L > 0 && di < de };
  }, [dExt, dInt, comp, sobra, qtd, geometria, mat, preco, modoPreco]);

  const escolher = (s: any) => {
    setSel(s);
    const t = `${s.componente ?? ""}`.toLowerCase();
    setGeometria(t.includes("tubo") || t.includes("camisa") ? "tubo" : "barra");
    if (t.includes("tubo") || t.includes("camisa")) setMaterial("Tubo brunido ST-52");
  };

  const escolherMaterial = (nome: string) => {
    setMaterial(nome);
    const m = materiais.find((x) => x.nome === nome);
    if (m?.preco) { setPreco(String(m.preco).replace(".", ",")); setModoPreco("kg"); }
  };

  const descricao = () => {
    const forma = geometria === "tubo"
      ? `tubo Ø ${dExt} x Ø int ${dInt} x ${num(calc.L, 0)}mm`
      : `barra Ø ${dExt} x ${num(calc.L, 0)}mm`;
    const preco_ = modoPreco === "kg" ? `${brl(Number(preco.replace(",", ".")) || 0)}/kg` : `${brl(Number(preco.replace(",", ".")) || 0)}/m`;
    return `Matéria-prima ${sel?.componente ?? ""}: ${mat.nome} ${forma}${calc.q > 1 ? ` (${calc.q} pç)` : ""} — ${num(calc.pesoTotal)} kg a ${preco_}`;
  };

  const salvarPreco = async () => {
    const p = Number(preco.replace(",", ".")) || 0;
    if (modoPreco !== "kg" || p <= 0) return toast.error("Informe o preço por kg para salvar como referência");
    const payload = { nome: mat.nome, densidade: mat.densidade, preco_base_kg: p };
    const q = mat.id
      ? supabase.from("materias_primas" as any).update({ preco_base_kg: p }).eq("id", mat.id)
      : supabase.from("materias_primas" as any).insert(payload);
    const { error } = await q;
    if (error) return toast.error("Erro ao salvar preço: " + error.message);
    toast.success("Preço de referência salvo");
    qc.invalidateQueries({ queryKey: ["materias_primas"] });
  };

  const registrar = async () => {
    if (!sel) return toast.error("Selecione um item da fila");
    if (!calc.valido) return toast.error("Confira as medidas");
    if (calc.custoTotal < 0.5) return toast.error("O custo precisa ser de no mínimo R$ 0,50");
    setSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const valor = Math.round(calc.custoTotal * 100) / 100;
      const desc = descricao();
      const { error } = sel.lancado
        ? await supabase.from("os_custos" as any).update({ descricao: desc, custo_interno: valor }).eq("id", sel.custoId)
        : await supabase.from("os_custos" as any).insert({
            id: sel.custoId, os_id: sel.os_id, descricao: desc, categoria: "material", custo_interno: valor,
            pago: false, data_pagamento: null, is_terceirizado: false, criado_por: auth.user?.id ?? null,
          });
      if (error) throw error;
      await supabase.from("historico_status_os" as any).insert({
        os_id: sel.os_id, status_novo: sel.ordens_servico?.status ?? "atualizado",
        status_anterior: sel.ordens_servico?.status ?? null,
        observacao: `${sel.lancado ? "Custo de matéria-prima recalculado" : "Custo de matéria-prima lançado"}: ${desc} — ${brl(valor)}`,
        executor_id: auth.user?.id ?? null, executor_email: auth.user?.email ?? null,
      });
      toast.success(`Custo de ${brl(valor)} lançado na OS ${sel.ordens_servico?.numero_os ?? ""}`);
      setSel({ ...sel, lancado: true, valorLancado: valor });
      qc.invalidateQueries({ queryKey: ["materiais_fila"] });
      qc.invalidateQueries({ queryKey: ["os_custos"] });
    } catch (e: any) {
      toast.error("Erro ao lançar custo: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground";

  return (
    <div className="space-y-6 p-4 md:p-8 pb-20">
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
            Engenharia / <span className="text-primary">Matéria-prima</span>
          </h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Calcule e lance o custo das peças refeitas direto na OS</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Fila */}
        <Card className="lg:col-span-5">
          <CardHeader className="border-b space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Peças a apurar
              </CardTitle>
              <Badge variant="secondary">{pendentes} pendente{pendentes === 1 ? "" : "s"}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="OS, cliente ou peça" className="pl-9" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={todos} onCheckedChange={setTodos} /> Mostrar todos os subserviços
            </label>
          </CardHeader>
          <CardContent className="p-0 max-h-[640px] overflow-y-auto">
            {visiveis.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma peça aguardando cálculo.</p>
            )}
            {visiveis.map((s: any) => (
              <button
                key={s.id}
                onClick={() => escolher(s)}
                className={`w-full text-left px-4 py-3 border-b flex gap-3 items-start hover:bg-muted/50 transition-colors ${sel?.id === s.id ? "bg-primary/10 border-l-4 border-l-primary" : ""}`}
              >
                {s.lancado ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" /> : <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">{s.componente || "Serviço"}</span>
                    <span className="text-[10px] font-black text-muted-foreground">OS {s.ordens_servico?.numero_os ?? "—"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.ordens_servico?.cliente ?? ""}{s.descricao ? ` · ${s.descricao}` : ""}</p>
                  {s.lancado && <p className="text-[11px] font-bold text-primary mt-0.5">Lançado {brl(s.valorLancado)}</p>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Calculadora */}
        <Card className="lg:col-span-7">
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Calculadora
            </CardTitle>
            {sel ? (
              <p className="text-xs mt-1">
                <span className="font-bold">OS {sel.ordens_servico?.numero_os}</span> · {sel.ordens_servico?.cliente} · <span className="text-primary font-bold">{sel.componente}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Selecione uma peça na fila para lançar o custo. A calculadora funciona sem seleção.</p>
            )}
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {(["barra", "tubo"] as const).map((g) => (
                <Button key={g} type="button" variant={geometria === g ? "default" : "outline"} onClick={() => setGeometria(g)} className="h-11 font-bold uppercase text-xs">
                  {g === "barra" ? <Layers className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
                  {g === "barra" ? "Barra maciça" : "Tubo / camisa"}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={lbl}>{geometria === "tubo" ? "Diâmetro externo" : "Diâmetro"}</Label>
                <Input value={dExt} onChange={(e) => setDExt(e.target.value)} placeholder='3.1/2" ou 88,9mm' className="h-11 font-bold" />
                <p className="text-[11px] text-muted-foreground">= {num(medidaParaMm(dExt), 1)} mm</p>
              </div>
              {geometria === "tubo" && (
                <div className="space-y-1.5">
                  <Label className={lbl}>Diâmetro interno</Label>
                  <Input value={dInt} onChange={(e) => setDInt(e.target.value)} placeholder='2.1/2" ou 63,5mm' className="h-11 font-bold" />
                  <p className="text-[11px] text-muted-foreground">= {num(medidaParaMm(dInt), 1)} mm</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className={lbl}>Comprimento da peça (mm)</Label>
                <Input value={comp} onChange={(e) => setComp(e.target.value)} inputMode="decimal" className="h-11 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Sobremetal corte/face (mm)</Label>
                <Input value={sobra} onChange={(e) => setSobra(e.target.value)} inputMode="decimal" className="h-11 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Quantidade de peças</Label>
                <Input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" className="h-11 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Material</Label>
                <Select value={material} onValueChange={escolherMaterial}>
                  <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materiais.map((m) => (
                      <SelectItem key={m.nome} value={m.nome}>
                        {m.nome} ({num(m.densidade)} g/cm³){m.preco ? ` · ${brl(m.preco)}/kg` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[auto_1fr] items-end">
              <div className="space-y-1.5">
                <Label className={lbl}>Preço por</Label>
                <div className="flex gap-1">
                  {(["kg", "metro"] as const).map((m) => (
                    <Button key={m} type="button" size="sm" variant={modoPreco === m ? "default" : "outline"} onClick={() => setModoPreco(m)} className="h-11 px-4 font-bold">
                      {m === "kg" ? "Kg" : "Metro"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Preço (R$/{modoPreco === "kg" ? "kg" : "m"})</Label>
                <div className="flex gap-2">
                  <Input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="0,00" className="h-11 font-bold" />
                  {podeEditarPreco && modoPreco === "kg" && (
                    <Button type="button" variant="outline" className="h-11" onClick={salvarPreco} title="Salvar como preço de referência deste material">
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-4">
              <div>
                <p className={lbl}>Peso unit.</p>
                <p className="font-display text-lg font-black">{num(calc.pesoUn)} kg</p>
              </div>
              <div>
                <p className={lbl}>Peso total</p>
                <p className="font-display text-lg font-black">{num(calc.pesoTotal)} kg</p>
              </div>
              <div>
                <p className={lbl}>Custo total</p>
                <p className="font-display text-lg font-black text-primary">{brl(calc.custoTotal)}</p>
              </div>
              <p className="col-span-3 text-[11px] text-muted-foreground">
                Comprimento de corte: {num(calc.L, 0)} mm{!calc.valido ? " · confira as medidas" : ""}
              </p>
            </div>

            {sel && calc.valido && <p className="text-xs text-muted-foreground border-l-2 border-primary pl-3">{descricao()}</p>}

            <Button
              onClick={registrar}
              disabled={!sel || !podeLancar || salvando || !calc.valido}
              className="w-full h-12 font-black uppercase tracking-widest"
            >
              {salvando ? "Lançando..." : sel?.lancado ? "Atualizar custo na OS" : "Registrar custo na OS"}
            </Button>
            {!podeLancar && <p className="text-xs text-muted-foreground text-center">Somente gestor, diretor ou financeiro lançam custos.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
