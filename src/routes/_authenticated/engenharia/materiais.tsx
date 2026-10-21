import { BotaoVoltar } from "@/components/BotaoVoltar";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calculator, CheckCircle2, Circle, Layers, Save, Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { idCustoAutomatico } from "@/lib/custos-automaticos";
import { encontrarPreco, pesoTeorico, valorCompra, type Formato, type PrecoReferencia } from "@/lib/materiais-calculo";
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

const PALAVRAS = ["haste", "tubo", "camisa", "embolo", "êmbolo", "porca", "bucha", "pino", "eixo", "flange", "tampa", "guia", "cabe", "olhal", "pistão", "pistao"];

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const num = (v: number, d = 2) => (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const n = (s: string) => Number(String(s).replace(",", ".")) || 0;

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

  const [formato, setFormato] = useState<Formato>("redondo");
  const [espec, setEspec] = useState("");
  const [acab, setAcab] = useState("");
  const [dExt, setDExt] = useState("");
  const [dInt, setDInt] = useState("");
  const [comp, setComp] = useState("");
  const [qtd, setQtd] = useState("1");
  const [precoManual, setPrecoManual] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: tabela = [] } = useQuery({
    queryKey: ["materiais_precos_referencia"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materiais_precos_referencia" as any).select("*").eq("ativo", true).order("especificacao");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ ...r, densidade: Number(r.densidade), preco_kg: Number(r.preco_kg), ipi_percentual: Number(r.ipi_percentual) })) as PrecoReferencia[];
    },
  });

  const doFormato = tabela.filter((r) => r.formato === formato);
  const especs = Array.from(new Set(doFormato.map((r) => r.especificacao))).sort();
  const acabs = Array.from(new Set(doFormato.filter((r) => r.especificacao === espec).map((r) => r.acabamento ?? ""))).sort();
  const densidade =
    doFormato.find((r) => r.especificacao === espec && (r.acabamento ?? "") === acab)?.densidade ??
    doFormato.find((r) => r.especificacao === espec)?.densidade ??
    7.85;

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
      // Custos de matéria-prima já gravados sobre a linha da destinação (ex.: "Comprar Nova - Haste")
      const osIds = Array.from(new Set(lista.map((s) => s.os_id)));
      const porOs = new Map<string, any[]>();
      for (let i = 0; i < osIds.length; i += 100) {
        const { data: c } = await supabase.from("os_custos" as any).select("id, os_id, descricao, custo_interno").in("os_id", osIds.slice(i, i + 100)).ilike("descricao", "Matéria-prima %");
        (c ?? []).forEach((x: any) => porOs.set(x.os_id, [...(porOs.get(x.os_id) ?? []), x]));
      }
      return lista
        .filter((s) => !["entregue", "cancelada", "encerrado"].includes(String(s.ordens_servico?.status ?? "")))
        .map((s, i) => {
          if (lancados.has(ids[i]!)) return { ...s, custoId: ids[i], lancado: true, valorLancado: lancados.get(ids[i]!) ?? 0 };
          const prefixo = `matéria-prima ${String(s.componente ?? "").toLowerCase()}:`;
          const ex = (porOs.get(s.os_id) ?? []).find((x) => String(x.descricao).toLowerCase().startsWith(prefixo));
          return ex
            ? { ...s, custoId: ex.id, lancado: true, valorLancado: Number(ex.custo_interno) || 0 }
            : { ...s, custoId: ids[i], lancado: false, valorLancado: 0 };
        });
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
    const di = formato === "tubo" ? medidaParaMm(dInt) : 0;
    const L = n(comp);
    const q = Math.max(1, Math.floor(n(qtd)) || 1);
    const peso = pesoTeorico(formato, de, L, densidade, di);
    const achado = espec ? encontrarPreco(tabela, espec, acab || null, formato, de, di) : null;
    const precoKg = n(precoManual) > 0 ? n(precoManual) : achado?.regra.preco_kg ?? 0;
    const ipiPct = achado?.regra.ipi_percentual ?? 3.25;
    const v = peso && precoKg > 0 ? valorCompra(peso, q, precoKg, ipiPct) : null;
    return { de, di, L, q, peso, achado, precoKg, ipiPct, v };
  }, [dExt, dInt, comp, qtd, formato, densidade, espec, acab, tabela, precoManual]);

  const escolher = (s: any) => {
    setSel(s);
    const t = `${s.componente ?? ""}`.toLowerCase();
    setFormato(t.includes("tubo") || t.includes("camisa") ? "tubo" : "redondo");
    setEspec(""); setAcab("");
  };

  const descricao = () => {
    const forma = formato === "tubo" ? `tubo Ø ${num(calc.de, 1)} x Ø int ${num(calc.di, 1)} x ${num(calc.L, 0)}mm` : `barra Ø ${num(calc.de, 1)} x ${num(calc.L, 0)}mm`;
    return `Matéria-prima ${sel?.componente ?? ""}: ${espec} ${acab} ${forma}${calc.q > 1 ? ` (${calc.q} pç)` : ""} — ${num((calc.peso ?? 0) * calc.q)} kg a ${brl(calc.precoKg)}/kg + IPI ${num(calc.ipiPct)}%`;
  };

  const salvarReferencia = async () => {
    const p = n(precoManual);
    if (!espec || !(p > 0) || !(calc.de > 0)) { toast.error("Informe especificação, medida e preço por kg"); return; }
    const { error } = await supabase.from("materiais_precos_referencia" as any).insert({
      especificacao: espec, acabamento: acab || null, formato, diametro_mm: Math.round(calc.de * 100) / 100,
      diametro_int_mm: formato === "tubo" ? Math.round(calc.di * 100) / 100 : null, densidade, preco_kg: p, observacao: "Cadastro manual na calculadora",
    });
    if (error) { toast.error("Erro ao salvar preço: " + error.message); return; }
    toast.success("Preço cadastrado na tabela de referência");
    setPrecoManual("");
    qc.invalidateQueries({ queryKey: ["materiais_precos_referencia"] });
  };

  const registrar = async () => {
    if (!sel) { toast.error("Selecione um item da fila"); return; }
    if (!calc.v) { toast.error("Confira medidas e preço"); return; }
    if (calc.v.total < 0.5) { toast.error("O custo precisa ser de no mínimo R$ 0,50"); return; }
    setSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const valor = calc.v.total;
      const desc = descricao();
      // Reaproveita o custo pendente criado pela destinação da peça (ex.: "Comprar Nova - Haste")
      let alvoId: string | null = sel.lancado ? sel.custoId : null;
      if (!alvoId) {
        const comp = String(sel.componente ?? "").trim().toLowerCase();
        const { data: pend } = await supabase.from("os_custos" as any)
          .select("id, descricao, custo_interno, pago").eq("os_id", sel.os_id).eq("categoria", "material");
        const achado = ((pend ?? []) as any[]).find((c) => {
          const d = String(c.descricao ?? "").toLowerCase();
          return !c.pago && Number(c.custo_interno ?? 0) <= 0 && comp && d.endsWith(`- ${comp}`);
        });
        alvoId = achado?.id ?? null;
      }
      const { error } = alvoId
        ? await supabase.from("os_custos" as any).update({ descricao: desc, custo_interno: valor }).eq("id", alvoId)
        : await supabase.from("os_custos" as any).insert({
            id: sel.custoId, os_id: sel.os_id, descricao: desc, categoria: "material", custo_interno: valor,
            pago: false, data_pagamento: null, is_terceirizado: false, criado_por: auth.user?.id ?? null,
          });
      if (error) throw error;
      if (alvoId) sel.custoId = alvoId;
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
  const semPreco = !!espec && calc.de > 0 && !calc.achado;

  return (
    <div className="space-y-6 p-4 md:p-8 pb-20">
      <div className="flex items-center gap-3">
        <BotaoVoltar />
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
              {(["redondo", "tubo"] as const).map((g) => (
                <Button key={g} type="button" variant={formato === g ? "default" : "outline"} onClick={() => { setFormato(g); setEspec(""); setAcab(""); }} className="h-11 font-bold uppercase text-xs">
                  {g === "redondo" ? <Layers className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
                  {g === "redondo" ? "Barra / tarugo" : "Tubo"}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={lbl}>Especificação</Label>
                <Select value={espec} onValueChange={(v) => { setEspec(v); setAcab(""); }}>
                  <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{especs.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Acabamento</Label>
                <Select value={acab} onValueChange={setAcab} disabled={!espec}>
                  <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{acabs.map((a) => <SelectItem key={a || "-"} value={a}>{a || "Sem acabamento"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>{formato === "tubo" ? "Diâmetro externo" : "Diâmetro"}</Label>
                <Input value={dExt} onChange={(e) => setDExt(e.target.value)} placeholder='2.1/4" ou 57,15mm' className="h-11 font-bold" />
                <p className="text-[11px] text-muted-foreground">= {num(calc.de, 2)} mm</p>
              </div>
              {formato === "tubo" && (
                <div className="space-y-1.5">
                  <Label className={lbl}>Diâmetro interno</Label>
                  <Input value={dInt} onChange={(e) => setDInt(e.target.value)} placeholder="80mm" className="h-11 font-bold" />
                  <p className="text-[11px] text-muted-foreground">= {num(calc.di, 2)} mm{calc.di > 0 && calc.di >= calc.de ? " · deve ser menor que o externo" : ""}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className={lbl}>Comprimento real (mm)</Label>
                <Input value={comp} onChange={(e) => setComp(e.target.value)} inputMode="decimal" className="h-11 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Quantidade de peças</Label>
                <Input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" className="h-11 font-bold" />
              </div>
            </div>

            {!!espec && calc.de > 0 && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
                <p className="text-xs">
                  {calc.achado
                    ? <>Base do fornecedor ({calc.achado.tipo === "exata" ? "medida exata" : calc.achado.tipo === "faixa" ? "faixa cadastrada" : `preço/kg do material, ref. Ø ${num(Number(calc.achado.regra.diametro_mm ?? calc.de), 1)}`}): <b>{brl(calc.achado.regra.preco_kg)}/kg</b> · densidade {num(densidade)} g/cm³</>
                    : <>Material sem preço base cadastrado. Informe o R$/kg abaixo.</>}
                </p>
                <div className="flex gap-2 items-center">
                  <Input value={precoManual} onChange={(e) => setPrecoManual(e.target.value)} inputMode="decimal" placeholder={calc.achado ? `Ajustar R$/kg (padrão ${num(calc.achado.regra.preco_kg)})` : "Preço R$/kg"} className="h-10 font-bold" />
                  {podeEditarPreco && n(precoManual) > 0 && (
                    <Button type="button" variant="outline" className="h-10" onClick={salvarReferencia}><Save className="h-4 w-4 mr-1" /> Salvar medida</Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border bg-muted/30 p-4">
              <div><p className={lbl}>Peso por peça</p><p className="font-display text-lg font-black">{calc.peso ? `${num(calc.peso, 3)} kg` : "—"}</p></div>
              <div><p className={lbl}>Material</p><p className="font-display text-lg font-black">{calc.v ? brl(calc.v.material) : "—"}</p></div>
              <div><p className={lbl}>IPI ({num(calc.ipiPct)}%)</p><p className="font-display text-lg font-black">{calc.v ? brl(calc.v.ipi) : "—"}</p></div>
              <div><p className={lbl}>Total de compra</p><p className="font-display text-lg font-black text-primary">{calc.v ? brl(calc.v.total) : "—"}</p></div>
              <p className="col-span-full text-[11px] text-muted-foreground">
                Peso total: {num((calc.peso ?? 0) * calc.q, 3)} kg · Estimativa pelo peso teórico; não inclui frete, ICMS ou margem.
              </p>
            </div>

            {sel && calc.v && <p className="text-xs text-muted-foreground border-l-2 border-primary pl-3">{descricao()}</p>}

            <Button onClick={registrar} disabled={!sel || !podeLancar || salvando || !calc.v} className="w-full h-12 font-black uppercase tracking-widest">
              {salvando ? "Lançando..." : sel?.lancado ? "Atualizar custo na OS" : "Registrar custo na OS"}
            </Button>
            {!podeLancar && <p className="text-xs text-muted-foreground text-center">Somente gestor, diretor ou financeiro lançam custos.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
