import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Receipt,
  Trash2,
  Calculator,
  Save,
  Printer,
  Building2,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Plus,
  ClipboardCheck,
  Percent,
  Send,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { getExecutorEmail } from "@/lib/log-executor";
import { toast } from "sonner";
import { avaliarFluxo, pendenciasAte } from "@/lib/os-fluxo";
import { calcularComissao, rotuloComissao } from "@/lib/comissao";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/os/$id/orcamento")({
  component: OrcamentoOSPage,
});

const brl = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const num = (v: unknown) => Number(v ?? 0) || 0;

function OrcamentoOSPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { isDiretor, isFinanceiro } = useUserRole();
  const podeOrcar = isDiretor || isFinanceiro;

  const [salvando, setSalvando] = useState(false);
  const [valorFinalManual, setValorFinalManual] = useState<number | null>(null);
  const [imposto, setImposto] = useState<number>(0);
  const [margemPadrao, setMargemPadrao] = useState<number>(30);
  const [condicoes, setCondicoes] = useState({
    prazoEntrega: 10,
    garantia: 90,
    validade: 15,
    pagamento: "",
    observacoes: "",
  });
  const [novoItem, setNovoItem] = useState({ descricao: "", custo: "" });

  /* ----------------------------- Dados reais ----------------------------- */

  const { data: os, isLoading: carregandoOS } = useQuery({
    queryKey: ["orcamento_os", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes ( * )")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: checklist = [], isLoading: carregandoChecklist } = useQuery({
    queryKey: ["orcamento_checklist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_checklist_tecnico")
        .select("id, componente, item_peca, estado, estado_atual, observacao_tecnica")
        .eq("os_id", id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: custos = [] } = useQuery({
    queryKey: ["orcamento_custos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos")
        .select("*, fornecedores ( nome )")
        .eq("os_id", id)
        .order("criado_em");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: empresa } = useQuery({
    queryKey: ["orcamento_empresa", os?.empresa_id],
    enabled: !!os,
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas_emissoras").select("*").order("criado_em");
      if (error) throw error;
      const lista = (data || []) as any[];
      return lista.find((e) => e.id === os?.empresa_id) || lista.find((e) => e.ativo) || lista[0] || null;
    },
  });

  const { data: config } = useQuery({
    queryKey: ["orcamento_config", empresa?.id],
    enabled: !!empresa,
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_empresa" as any).select("*").order("id");
      if (error) throw error;
      const lista = (data || []) as any[];
      return lista.find((c) => c.empresa_id === empresa?.id) || lista[0] || null;
    },
  });

  const { data: vendedor } = useQuery({
    queryKey: ["orcamento_vendedor", os?.clientes?.vendedor_id],
    enabled: !!os?.clientes?.vendedor_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendedores")
        .select("*")
        .eq("id", os.clientes.vendedor_id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: faturamentoMes = 0 } = useQuery({
    queryKey: ["orcamento_faturamento_mes", vendedor?.id],
    enabled: !!vendedor?.id && vendedor?.tipo_comissao === "metas",
    queryFn: async () => {
      const inicio = new Date();
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      const { data, error } = await (supabase as any)
        .from("ordens_servico")
        .select("valor_total, clientes!inner(vendedor_id)")
        .eq("clientes.vendedor_id", vendedor.id)
        .gte("criado_em", inicio.toISOString());
      if (error) throw error;
      return (data || []).reduce((acc: number, o: any) => acc + num(o.valor_total), 0);
    },
  });

  /* ------------------- Regras automáticas da empresa --------------------- */

  const [regrasAplicadas, setRegrasAplicadas] = useState(false);
  useEffect(() => {
    if (!config || regrasAplicadas) return;
    setImposto(num(config.imposto_padrao));
    if (num(config.margem_padrao) > 0) setMargemPadrao(num(config.margem_padrao));
    setCondicoes({
      prazoEntrega: num(config.prazo_entrega_padrao) || 10,
      garantia: num(config.prazo_garantia_padrao) || 90,
      validade: num(config.validade_orcamento_dias) || 15,
      pagamento: config.condicoes_pagamento || "",
      observacoes: config.observacoes_orcamento || "",
    });
    setRegrasAplicadas(true);
  }, [config, regrasAplicadas]);

  /* ------------------------------ Cálculos ------------------------------- */

  const linhas = useMemo(
    () =>
      custos.map((c) => {
        const custo = num(c.custo_interno) || num(c.valor_total_custo);
        const margem = c.margem_lucro_percentual != null ? num(c.margem_lucro_percentual) : margemPadrao;
        const venda = num(c.preco_venda_final) > 0 ? num(c.preco_venda_final) : custo * (1 + margem / 100);
        return { ...c, custo, margem, venda };
      }),
    [custos, margemPadrao],
  );

  const totais = useMemo(() => {
    const custoTotal = linhas.reduce((a, l) => a + l.custo, 0);
    const vendaItens = linhas.reduce((a, l) => a + l.venda, 0);
    const custoPecas = linhas
      .filter((l) => !l.is_terceirizado && !String(l.categoria || "").toLowerCase().includes("terceir"))
      .reduce((a, l) => a + l.custo, 0);
    const custoTerceiros = linhas
      .filter((l) => l.is_terceirizado || String(l.categoria || "").toLowerCase().includes("terceir"))
      .reduce((a, l) => a + l.custo, 0);

    const valorImposto = vendaItens * (imposto / 100);
    const sugerido = vendaItens + valorImposto;
    const valorFinal = valorFinalManual !== null ? valorFinalManual : sugerido;

    const comissao = calcularComissao(vendedor, {
      valorOS: valorFinal,
      custoPecas,
      custoTerceiros,
      faturamentoMes: num(faturamentoMes) + valorFinal,
    });

    const lucro = valorFinal - valorImposto - custoTotal - comissao.valor;
    const margemEfetiva = valorFinal > 0 ? (lucro / valorFinal) * 100 : 0;

    return {
      custoTotal,
      custoPecas,
      custoTerceiros,
      vendaItens,
      valorImposto,
      sugerido,
      valorFinal,
      comissao,
      lucro,
      margemEfetiva,
    };
  }, [linhas, imposto, valorFinalManual, vendedor, faturamentoMes]);

  /* ------------------------------- Ações --------------------------------- */

  const recarregarCustos = () => queryClient.invalidateQueries({ queryKey: ["orcamento_custos", id] });

  const atualizarLinha = async (linha: any, campos: Record<string, any>) => {
    const { error } = await supabase.from("os_custos").update(campos).eq("id", linha.id);
    if (error) {
      toast.error("Erro ao atualizar item: " + error.message);
      return;
    }
    recarregarCustos();
  };

  const adicionarItem = async () => {
    if (!novoItem.descricao.trim()) {
      toast.error("Informe a descrição do item.");
      return;
    }
    const custo = num(novoItem.custo);
    const { error } = await supabase.from("os_custos").insert({
      os_id: id,
      descricao: novoItem.descricao.trim().toUpperCase(),
      categoria: "orcamento",
      custo_interno: custo,
      margem_lucro_percentual: margemPadrao,
      is_terceirizado: false,
    } as any);
    if (error) {
      toast.error("Erro ao adicionar item: " + error.message);
      return;
    }
    setNovoItem({ descricao: "", custo: "" });
    recarregarCustos();
    toast.success("Item adicionado ao orçamento.");
  };

  const removerItem = async (linha: any) => {
    if (!confirm(`Remover "${linha.descricao}" do orçamento? O custo será excluído da OS.`)) return;
    const { error } = await supabase.from("os_custos").delete().eq("id", linha.id);
    if (error) {
      toast.error("Erro ao remover item: " + error.message);
      return;
    }
    recarregarCustos();
  };

  const salvar = async (enviarAprovacao: boolean) => {
    setSalvando(true);
    try {
      const payload: Record<string, any> = {
        custo_base: totais.custoTotal,
        valor_final: totais.valorFinal,
        valor_total: totais.valorFinal,
        imposto_aplicado: imposto,
        margem_lucro_aplicada: Number(totais.margemEfetiva.toFixed(2)),
        margem_lucro: Number(totais.margemEfetiva.toFixed(2)),
        comissao_calculada: totais.comissao.valor,
      };
      if (enviarAprovacao) {
        payload["status"] = "orcamento_pendente";
        payload["status_financeiro"] = "Aguardando Aprovação";
        payload["orcamento_enviado_em"] = new Date().toISOString();
      }

      const { error } = await supabase.from("ordens_servico").update(payload as any).eq("id", id);
      if (error) throw error;

      const email = await getExecutorEmail();
      await supabase.from("historico_status_os").insert({
        os_id: id,
        status_anterior: os?.status ?? null,
        status_novo: enviarAprovacao ? "orcamento_pendente" : os?.status || "orcamento",
        observacao: `${enviarAprovacao ? "Orçamento enviado para aprovação" : "Orçamento salvo"} — ${brl(totais.valorFinal)} (margem ${totais.margemEfetiva.toFixed(1)}%, imposto ${imposto}%, comissão ${brl(totais.comissao.valor)})`,
        executor_email: email,
      } as any);

      queryClient.invalidateQueries({ queryKey: ["orcamento_os", id] });
      queryClient.invalidateQueries({ queryKey: ["os_detail", id] });
      toast.success(enviarAprovacao ? "Orçamento enviado para aprovação." : "Orçamento salvo.");
    } catch (e: any) {
      toast.error("Erro ao salvar orçamento: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  /* ------------------------------ Bloqueios ------------------------------ */

  if (!podeOrcar) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto" />
        <h1 className="text-xl font-black uppercase text-slate-900">Acesso restrito</h1>
        <p className="text-sm text-slate-500">
          A geração de orçamentos é exclusiva dos perfis Diretor e Financeiro/Administrativo.
        </p>
        <Button asChild variant="outline" className="font-bold uppercase text-[10px] tracking-widest">
          <Link to="/os/$id" params={{ id }}>Voltar para a OS</Link>
        </Button>
      </div>
    );
  }

  if (carregandoOS || carregandoChecklist) {
    return (
      <div className="p-10 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Carregando orçamento...
      </div>
    );
  }

  // Bloqueio derivado da sequência oficial da OS (src/lib/os-fluxo.ts)
  const resultadoFluxo = avaliarFluxo(os, { checklist, custos });
  const pendenciasAnteriores = pendenciasAte("orcamento", resultadoFluxo);

  if (pendenciasAnteriores.length > 0) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center space-y-4">
        <ClipboardCheck className="h-10 w-10 text-amber-500 mx-auto" />
        <h1 className="text-xl font-black uppercase text-slate-900">Fases anteriores pendentes</h1>
        <p className="text-sm text-slate-500">
          O orçamento só pode ser elaborado depois de concluir as etapas anteriores desta OS.
        </p>
        <ul className="mx-auto max-w-sm space-y-2 text-left">
          {pendenciasAnteriores.map((p) => (
            <li
              key={p}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-slate-700"
            >
              {p}
            </li>
          ))}
        </ul>
        <Button asChild className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
          <Link to="/os/$id" params={{ id }}>Voltar para a OS</Link>
        </Button>
      </div>
    );
  }

  /* -------------------------------- Tela --------------------------------- */

  const cliente = os?.clientes;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1400px] mx-auto pb-24">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Link to="/os/$id" params={{ id }}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              {os?.numero_os || "OS"} · {cliente?.nome || cliente?.razao_social || os?.cliente}
            </p>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight text-slate-900">
              Orçamento <span className="text-primary">Financeiro</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {checklist.length} itens de checklist analisados · {linhas.length} custos lançados
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-10 font-bold uppercase text-[10px] tracking-widest border-slate-300"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
          <Button
            variant="outline"
            disabled={salvando}
            className="h-10 font-bold uppercase text-[10px] tracking-widest border-slate-300"
            onClick={() => salvar(false)}
          >
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
          <Button
            disabled={salvando}
            className="h-10 px-6 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest"
            onClick={() => salvar(true)}
          >
            <Send className="mr-2 h-4 w-4" /> Enviar para aprovação
          </Button>
        </div>
      </div>

      {/* Dados automáticos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" /> Empresa emissora
            </p>
            <p className="text-sm font-black uppercase text-slate-900">{empresa?.nome || "Não definida"}</p>
            <p className="text-[11px] font-medium text-slate-500">{empresa?.razao_social}</p>
            <p className="text-[11px] font-bold text-slate-600">CNPJ {empresa?.cnpj || "—"}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
            <p className="text-sm font-black uppercase text-slate-900">
              {cliente?.nome || cliente?.razao_social || os?.cliente}
            </p>
            <p className="text-[11px] font-medium text-slate-500">CNPJ {cliente?.cnpj || "—"}</p>
            <p className="text-[11px] font-medium text-slate-500">{cliente?.email || cliente?.telefone || ""}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-primary" /> Vendedor / regra de comissão
            </p>
            {vendedor ? (
              <>
                <p className="text-sm font-black uppercase text-slate-900">{vendedor.apelido || vendedor.nome}</p>
                <Badge variant="outline" className="text-[9px] font-black uppercase">
                  {rotuloComissao(vendedor)}
                </Badge>
                <p className="text-[11px] font-medium text-slate-500">{totais.comissao.descricao}</p>
              </>
            ) : (
              <p className="text-[11px] font-medium text-slate-400">
                Nenhum vendedor vinculado ao cliente. Comissão zerada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Itens de custo */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-slate-50 border-b border-border/50">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Custos da OS (peças, terceiros e extras)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-border">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descrição</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-28">Categoria</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-32">Custo (R$)</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-24">Margem %</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-32 text-right">Venda</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase italic">
                        Nenhum custo lançado nesta OS.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linhas.map((linha) => (
                      <TableRow key={linha.id} className="border-border hover:bg-slate-50/50">
                        <TableCell>
                          <p className="text-xs font-bold uppercase text-slate-900">{linha.descricao}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {linha.fornecedores?.nome || linha.terceiro_nome || "Interno"}
                            {linha.pago ? " · pago" : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-black uppercase">
                            {linha.is_terceirizado ? "terceiro" : linha.categoria || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={linha.custo}
                            onBlur={(e) => {
                              const v = num(e.target.value);
                              if (v !== linha.custo) atualizarLinha(linha, { custo_interno: v });
                            }}
                            className="h-8 text-xs font-bold border-slate-200"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={linha.margem}
                            onBlur={(e) => {
                              const v = num(e.target.value);
                              if (v !== linha.margem)
                                atualizarLinha(linha, { margem_lucro_percentual: v, preco_venda_final: null });
                            }}
                            className="h-8 text-xs font-bold border-slate-200"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900">{brl(linha.venda)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removerItem(linha)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="p-4 bg-slate-50 border-t border-border flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Novo item / serviço</Label>
                  <Input
                    value={novoItem.descricao}
                    onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                    placeholder="Ex.: mão de obra de montagem"
                    className="h-9 text-xs border-slate-200 bg-white"
                  />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Custo (R$)</Label>
                  <Input
                    type="number"
                    value={novoItem.custo}
                    onChange={(e) => setNovoItem({ ...novoItem, custo: e.target.value })}
                    className="h-9 text-xs border-slate-200 bg-white font-bold"
                  />
                </div>
                <Button
                  onClick={adicionarItem}
                  className="h-9 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest"
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Condições comerciais automáticas */}
          <Card className="border-border shadow-md">
            <CardHeader className="bg-slate-50 border-b border-border/50">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" /> Condições comerciais (padrão da empresa)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Prazo de entrega (dias)</Label>
                  <Input
                    type="number"
                    value={condicoes.prazoEntrega}
                    onChange={(e) => setCondicoes({ ...condicoes, prazoEntrega: num(e.target.value) })}
                    className="h-9 border-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Garantia (dias)</Label>
                  <Input
                    type="number"
                    value={condicoes.garantia}
                    onChange={(e) => setCondicoes({ ...condicoes, garantia: num(e.target.value) })}
                    className="h-9 border-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Validade (dias)</Label>
                  <Input
                    type="number"
                    value={condicoes.validade}
                    onChange={(e) => setCondicoes({ ...condicoes, validade: num(e.target.value) })}
                    className="h-9 border-slate-200 font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-500">Condições de pagamento</Label>
                <Input
                  value={condicoes.pagamento}
                  onChange={(e) => setCondicoes({ ...condicoes, pagamento: e.target.value })}
                  className="h-9 border-slate-200 font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-500">Observações da proposta</Label>
                <Textarea
                  value={condicoes.observacoes}
                  onChange={(e) => setCondicoes({ ...condicoes, observacoes: e.target.value })}
                  className="min-h-24 border-slate-200 text-xs"
                />
              </div>
              <p className="text-[10px] font-medium text-slate-400">
                Valores carregados automaticamente das regras cadastradas em Configurações para o CNPJ emissor.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resumo financeiro */}
        <div className="lg:col-span-4">
          <Card className="border-border shadow-xl bg-slate-900 text-white sticky top-6">
            <CardHeader className="bg-slate-800/50 border-b border-white/5">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> Resumo financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2 text-[11px] font-bold uppercase">
                <div className="flex justify-between text-slate-400">
                  <span>Custo peças</span>
                  <span className="text-white">{brl(totais.custoPecas)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Custo terceiros</span>
                  <span className="text-white">{brl(totais.custoTerceiros)}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-t border-white/5 pt-2">
                  <span>Custo total</span>
                  <span className="text-red-400">{brl(totais.custoTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Venda dos itens</span>
                  <span className="text-white">{brl(totais.vendaItens)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Imposto (%)</Label>
                  <Input
                    type="number"
                    value={imposto}
                    onChange={(e) => setImposto(num(e.target.value))}
                    className="h-9 bg-slate-800 border-white/10 text-white font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Margem padrão (%)</Label>
                  <Input
                    type="number"
                    value={margemPadrao}
                    onChange={(e) => setMargemPadrao(num(e.target.value))}
                    className="h-9 bg-slate-800 border-white/10 text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400">
                <span>Imposto (R$)</span>
                <span className="text-white">{brl(totais.valorImposto)}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-500">Valor final ao cliente</Label>
                <Input
                  type="number"
                  value={valorFinalManual !== null ? valorFinalManual : totais.sugerido.toFixed(2)}
                  onChange={(e) => setValorFinalManual(num(e.target.value))}
                  className={`h-12 bg-slate-800 border-white/10 text-white text-lg font-black ${
                    valorFinalManual !== null ? "ring-1 ring-primary border-primary" : ""
                  }`}
                />
                {valorFinalManual !== null && (
                  <button
                    className="text-[9px] font-black uppercase tracking-widest text-primary"
                    onClick={() => setValorFinalManual(null)}
                  >
                    Voltar ao valor sugerido ({brl(totais.sugerido)})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800 border border-white/5">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Margem líquida</p>
                  <p className="text-lg font-black text-emerald-400">{totais.margemEfetiva.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800 border border-white/5">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Lucro previsto</p>
                  <p className="text-lg font-black text-white">{brl(totais.lucro)}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Comissão do vendedor</p>
                <p className="text-base font-black text-primary">{brl(totais.comissao.valor)}</p>
                <p className="text-[10px] font-medium text-slate-400">{totais.comissao.descricao}</p>
              </div>

              <Button
                disabled={salvando}
                onClick={() => salvar(true)}
                className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px]"
              >
                {salvando ? "Processando..." : "Enviar para aprovação"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
