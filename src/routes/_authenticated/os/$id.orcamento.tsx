import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Receipt,
  Trash2,
  Calculator,
  Save,
  FileText,
  Building2,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Plus,
  ClipboardCheck,
  Percent,
  Send,
  Pencil,
  Images,
  Sparkles,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { getExecutorEmail } from "@/lib/log-executor";
import { toast } from "sonner";
import { avaliarFluxo, pendenciasAte } from "@/lib/os-fluxo";
import { calcularComissao, rotuloComissao } from "@/lib/comissao";
import {
  brl,
  num,
  carregarFotosOs,
  empresaDoCadastro,
  vendedorDoCadastro,
  EMPRESA_VAZIA,
  VENDEDOR_VAZIO,
  type EmpresaSnapshot,
  type VendedorSnapshot,
  type CondicoesProposta,
} from "@/lib/orcamento";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/os/$id/orcamento")({
  component: OrcamentoOSPage,
});

function OrcamentoOSPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { isDiretor, isFinanceiro } = useUserRole();
  const podeOrcar = isDiretor || isFinanceiro;

  const [salvando, setSalvando] = useState(false);
  const [valorFinalManual, setValorFinalManual] = useState<number | null>(null);
  const [imposto, setImposto] = useState<number>(0);
  const [margemPadrao, setMargemPadrao] = useState<number>(30);
  const [condicoes, setCondicoes] = useState<CondicoesProposta>({
    prazoEntrega: 10,
    garantia: 90,
    validade: 15,
    pagamento: "",
    observacoes: "",
    comissaoManual: null,
    comissaoVisivel: false,
  });
  const [novoItem, setNovoItem] = useState({ descricao: "", custo: "" });
  const [novoLivre, setNovoLivre] = useState({ descricao: "", quantidade: "1", valor: "" });

  const [empresaEdit, setEmpresaEdit] = useState<EmpresaSnapshot | null>(null);
  const [vendedorEdit, setVendedorEdit] = useState<VendedorSnapshot | null>(null);
  const [dialogEmpresa, setDialogEmpresa] = useState(false);
  const [dialogVendedor, setDialogVendedor] = useState(false);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<string[]>([]);
  const [secoesAbertas, setSecoesAbertas] = useState({
    custos: true,
    proposta: true,
    fotos: true,
    condicoes: true,
  });

  const alternarSecao = (secao: keyof typeof secoesAbertas) => {
    setSecoesAbertas((atual) => ({ ...atual, [secao]: !atual[secao] }));
  };

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

  const { data: itensLivres = [] } = useQuery({
    queryKey: ["orcamento_itens_livres", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_itens" as any)
        .select("*")
        .eq("os_id", id)
        .order("ordem");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: fotos = [] } = useQuery({
    queryKey: ["orcamento_fotos", id],
    queryFn: () => carregarFotosOs(id),
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["orcamento_empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas_emissoras").select("*").order("criado_em");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [empresaIdSel, setEmpresaIdSel] = useState<string | null>(null);

  const empresa = useMemo(() => {
    if (!empresas.length) return null;
    return (
      empresas.find((e) => e.id === empresaIdSel) ||
      empresas.find((e) => e.id === os?.empresa_id) ||
      empresas.find((e) => e.ativo) ||
      empresas[0] ||
      null
    );
  }, [empresas, empresaIdSel, os?.empresa_id]);

  const trocarEmpresa = (novoId: string) => {
    setEmpresaIdSel(novoId);
    setEmpresaEdit(null);
    setRegrasAplicadas(false);
  };


  const { data: config } = useQuery({
    queryKey: ["orcamento_config", empresa?.id],
    enabled: !!empresa,
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_empresa" as any).select("*");
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

  const { data: dadosOrcamento } = useQuery({
    queryKey: ["orcamento_dados", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_dados" as any)
        .select("*")
        .eq("os_id", id)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as any;
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
    setCondicoes((atual) => ({
      ...atual,
      prazoEntrega: num(config.prazo_entrega_padrao) || atual.prazoEntrega,
      garantia: num(config.prazo_garantia_padrao) || atual.garantia,
      validade: num(config.validade_orcamento_dias) || atual.validade,
      pagamento: config.condicoes_pagamento || atual.pagamento,
      observacoes: config.observacoes_orcamento || atual.observacoes,
    }));
    setRegrasAplicadas(true);
  }, [config, regrasAplicadas]);

  // Snapshots salvos neste orçamento têm prioridade sobre o cadastro.
  const [dadosAplicados, setDadosAplicados] = useState(false);
  useEffect(() => {
    if (dadosOrcamento === undefined || dadosAplicados) return;
    if (dadosOrcamento?.empresa_snapshot) setEmpresaEdit(dadosOrcamento.empresa_snapshot);
    if (dadosOrcamento?.vendedor_snapshot) setVendedorEdit(dadosOrcamento.vendedor_snapshot);
    if (dadosOrcamento?.fotos_selecionadas) setFotosSelecionadas(dadosOrcamento.fotos_selecionadas);
    if (dadosOrcamento?.condicoes) setCondicoes((a) => ({ ...a, ...dadosOrcamento.condicoes }));
    setDadosAplicados(true);
  }, [dadosOrcamento, dadosAplicados]);

  const empresaCadastro = useMemo(() => empresaDoCadastro(empresa), [empresa]);
  const vendedorCadastro = useMemo(() => vendedorDoCadastro(vendedor), [vendedor]);
  const empresaProposta: EmpresaSnapshot = { ...EMPRESA_VAZIA, ...empresaCadastro, ...(empresaEdit || {}) };
  const vendedorProposta: VendedorSnapshot = {
    ...VENDEDOR_VAZIO,
    ...vendedorCadastro,
    ...(vendedorEdit || {}),
  };

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

  const totalLivres = useMemo(
    () => itensLivres.reduce((a, l) => a + (num(l.quantidade) || 1) * num(l.valor_unitario), 0),
    [itensLivres],
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

    const base = vendaItens + totalLivres;
    const valorImposto = base * (imposto / 100);
    const sugerido = base + valorImposto;
    const valorFinal = valorFinalManual !== null ? valorFinalManual : sugerido;

    const comissaoRegra = calcularComissao(vendedor, {
      valorOS: valorFinal,
      custoPecas,
      custoTerceiros,
      faturamentoMes: num(faturamentoMes) + valorFinal,
    });

    const manual = condicoes.comissaoManual;
    const comissaoAjustada = manual !== null && manual !== undefined;
    const comissao = comissaoAjustada
      ? { ...comissaoRegra, valor: num(manual), descricao: "Comissão ajustada manualmente neste orçamento" }
      : comissaoRegra;

    const lucro = valorFinal - valorImposto - custoTotal - comissao.valor;
    const margemEfetiva = valorFinal > 0 ? (lucro / valorFinal) * 100 : 0;

    return {
      custoTotal,
      custoPecas,
      custoTerceiros,
      vendaItens,
      base,
      valorImposto,
      sugerido,
      valorFinal,
      comissao,
      comissaoRegra,
      comissaoAjustada,
      lucro,
      margemEfetiva,
    };
  }, [linhas, totalLivres, imposto, valorFinalManual, vendedor, faturamentoMes, condicoes.comissaoManual]);

  /* ------------------------------- Ações --------------------------------- */

  const recarregarCustos = () => queryClient.invalidateQueries({ queryKey: ["orcamento_custos", id] });
  const recarregarLivres = () => queryClient.invalidateQueries({ queryKey: ["orcamento_itens_livres", id] });

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

  const adicionarLivre = async () => {
    if (!novoLivre.descricao.trim()) {
      toast.error("Informe a descrição do item da proposta.");
      return;
    }
    const { error } = await supabase.from("orcamento_itens" as any).insert({
      os_id: id,
      descricao: novoLivre.descricao.trim().toUpperCase(),
      quantidade: num(novoLivre.quantidade) || 1,
      valor_unitario: num(novoLivre.valor),
      ordem: itensLivres.length,
    } as any);
    if (error) {
      toast.error("Erro ao adicionar item: " + error.message);
      return;
    }
    setNovoLivre({ descricao: "", quantidade: "1", valor: "" });
    recarregarLivres();
  };

  const atualizarLivre = async (linha: any, campos: Record<string, any>) => {
    const { error } = await supabase.from("orcamento_itens" as any).update(campos).eq("id", linha.id);
    if (error) {
      toast.error("Erro ao atualizar item: " + error.message);
      return;
    }
    recarregarLivres();
  };

  const removerLivre = async (linha: any) => {
    const { error } = await supabase.from("orcamento_itens" as any).delete().eq("id", linha.id);
    if (error) {
      toast.error("Erro ao remover item: " + error.message);
      return;
    }
    recarregarLivres();
  };

  const alternarFoto = (fotoId: string) =>
    setFotosSelecionadas((atual) =>
      atual.includes(fotoId) ? atual.filter((f) => f !== fotoId) : [...atual, fotoId],
    );

  const persistirDadosProposta = async () => {
    const payload = {
      os_id: id,
      empresa_snapshot: empresaProposta,
      vendedor_snapshot: vendedorProposta,
      fotos_selecionadas: fotosSelecionadas,
      condicoes: { ...condicoes, comissaoExibida: totais.comissao.valor },
    };
    const { error } = await supabase
      .from("orcamento_dados" as any)
      .upsert(payload as any, { onConflict: "os_id" });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["orcamento_dados", id] });
  };

  const salvar = async (enviarAprovacao: boolean) => {
    setSalvando(true);
    try {
      const payload: Record<string, any> = {
        empresa_id: empresa?.id ?? null,
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

      await persistirDadosProposta();

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
      return true;
    } catch (e: any) {
      toast.error("Erro ao salvar orçamento: " + (e?.message || e));
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const gerarPdf = async () => {
    const ok = await salvar(false);
    if (!ok) return;
    window.open(`/os/${id}/proposta?print=1`, "_blank");
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
              {linhas.length} custos reais · {itensLivres.length} itens de proposta ·{" "}
              {fotosSelecionadas.length} fotos no PDF
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={salvando}
            className="h-10 font-bold uppercase text-[10px] tracking-widest border-slate-300"
            onClick={() => salvar(false)}
          >
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
          <Button
            variant="outline"
            disabled={salvando}
            className="h-10 font-bold uppercase text-[10px] tracking-widest border-slate-900 text-slate-900"
            onClick={gerarPdf}
          >
            <FileText className="mr-2 h-4 w-4" /> Gerar PDF
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

      {/* Dados do documento */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-primary" /> Empresa emissora
              </p>
              <div className="flex items-center gap-1">
                {empresaEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400"
                    title="Restaurar dados do cadastro"
                    onClick={() => setEmpresaEdit(null)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-primary"
                  onClick={() => {
                    setEmpresaEdit(empresaProposta);
                    setDialogEmpresa(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Select value={empresa?.id || ""} onValueChange={trocarEmpresa}>
              <SelectTrigger className="h-9 text-xs font-bold uppercase border-slate-300">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id} className="text-xs font-bold uppercase">
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] font-medium text-slate-500">{empresaProposta.razao_social}</p>
            <p className="text-[11px] font-bold text-slate-600">CNPJ {empresaProposta.cnpj || "—"}</p>
            <p className="text-[11px] font-medium text-slate-500">{empresaProposta.endereco}</p>
            {empresaEdit && (
              <Badge variant="outline" className="text-[8px] font-black uppercase text-amber-600 border-amber-300">
                Editado só neste orçamento
              </Badge>
            )}

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
            <div className="flex items-start justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-primary" /> Vendedor responsável
              </p>
              <div className="flex items-center gap-1">
                {vendedorEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400"
                    title="Restaurar dados do cadastro"
                    onClick={() => setVendedorEdit(null)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-primary"
                  onClick={() => {
                    setVendedorEdit(vendedorProposta);
                    setDialogVendedor(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm font-black uppercase text-slate-900">
              {vendedorProposta.nome || "Sem vendedor vinculado"}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {[vendedorProposta.telefone, vendedorProposta.email].filter(Boolean).join(" · ")}
            </p>
            {vendedor && (
              <>
                <Badge variant="outline" className="text-[9px] font-black uppercase">
                  {rotuloComissao(vendedor)}
                </Badge>
                <p className="text-[11px] font-medium text-slate-500">{totais.comissao.descricao}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          {/* Custos reais */}
          <Card className="border-border shadow-md">
            <CardHeader
              className="cursor-pointer bg-slate-50 border-b border-border/50"
              onClick={() => alternarSecao("custos")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Receipt className="h-4 w-4 shrink-0 text-primary" /> Custos reais da OS (peças, terceiros e extras)
                  </CardTitle>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                    Custo: {brl(totais.custoTotal)} · Venda: {brl(totais.vendaItens)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={secoesAbertas.custos ? "Fechar custos reais" : "Abrir custos reais"}
                  aria-expanded={secoesAbertas.custos}
                  title={secoesAbertas.custos ? "Fechar" : "Abrir"}
                  className="h-8 w-8 shrink-0 text-slate-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarSecao("custos");
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${secoesAbertas.custos ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            {secoesAbertas.custos && <CardContent className="p-0">
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
                  <Label className="text-[9px] font-black uppercase text-slate-500">Novo custo real</Label>
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
            </CardContent>}
          </Card>

          {/* Itens livres da proposta */}
          <Card className="border-amber-200 shadow-md">
            <CardHeader
              className="cursor-pointer bg-amber-50 border-b border-amber-200"
              onClick={() => alternarSecao("proposta")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-500" /> Itens da proposta ao cliente
                  </CardTitle>
                  <p className="mt-1 text-[10px] font-black text-amber-700">Total dos itens: {brl(totalLivres)}</p>
                  <p className="text-[10px] font-medium text-slate-500">
                    A soma integral destes itens entra no valor final apresentado ao cliente.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={secoesAbertas.proposta ? "Fechar itens da proposta" : "Abrir itens da proposta"}
                  aria-expanded={secoesAbertas.proposta}
                  title={secoesAbertas.proposta ? "Fechar" : "Abrir"}
                  className="h-8 w-8 shrink-0 text-slate-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarSecao("proposta");
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${secoesAbertas.proposta ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            {secoesAbertas.proposta && <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-border">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descrição</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-20">Qtd</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-32">Unitário</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-32 text-right">Total</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensLivres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-[10px] font-bold text-slate-400 uppercase italic">
                        Nenhum item de proposta.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itensLivres.map((l) => (
                      <TableRow key={l.id} className="border-border">
                        <TableCell>
                          <Input
                            defaultValue={l.descricao}
                            onBlur={(e) => {
                              const v = e.target.value.trim().toUpperCase();
                              if (v && v !== l.descricao) atualizarLivre(l, { descricao: v });
                            }}
                            className="h-8 text-xs font-bold border-slate-200"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={num(l.quantidade)}
                            onBlur={(e) => {
                              const v = num(e.target.value) || 1;
                              if (v !== num(l.quantidade)) atualizarLivre(l, { quantidade: v });
                            }}
                            className="h-8 text-xs font-bold border-slate-200"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={num(l.valor_unitario)}
                            onBlur={(e) => {
                              const v = num(e.target.value);
                              if (v !== num(l.valor_unitario)) atualizarLivre(l, { valor_unitario: v });
                            }}
                            className="h-8 text-xs font-bold border-slate-200"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900">
                          {brl((num(l.quantidade) || 1) * num(l.valor_unitario))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removerLivre(l)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="p-4 bg-amber-50/60 border-t border-amber-200 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Descrição</Label>
                  <Input
                    value={novoLivre.descricao}
                    onChange={(e) => setNovoLivre({ ...novoLivre, descricao: e.target.value })}
                    placeholder="Ex.: serviço de inspeção dimensional"
                    className="h-9 text-xs border-amber-200 bg-white"
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Qtd</Label>
                  <Input
                    type="number"
                    value={novoLivre.quantidade}
                    onChange={(e) => setNovoLivre({ ...novoLivre, quantidade: e.target.value })}
                    className="h-9 text-xs border-amber-200 bg-white font-bold"
                  />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Valor unit. (R$)</Label>
                  <Input
                    type="number"
                    value={novoLivre.valor}
                    onChange={(e) => setNovoLivre({ ...novoLivre, valor: e.target.value })}
                    className="h-9 text-xs border-amber-200 bg-white font-bold"
                  />
                </div>
                <Button
                  onClick={adicionarLivre}
                  className="h-9 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest"
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" /> Adicionar
                </Button>
              </div>
            </CardContent>}
          </Card>

          {/* Fotos do PDF */}
          <Card className="border-border shadow-md">
            <CardHeader
              className="cursor-pointer bg-slate-50 border-b border-border/50"
              onClick={() => alternarSecao("fotos")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Images className="h-4 w-4 shrink-0 text-primary" /> Fotos que entram no PDF
                  </CardTitle>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                    {fotosSelecionadas.length} de {fotos.length} selecionadas
                  </p>
                  <p className="text-[10px] font-medium text-slate-500">
                    Nenhuma marcada: o PDF sai sem registro fotográfico.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={secoesAbertas.fotos ? "Fechar fotos do PDF" : "Abrir fotos do PDF"}
                  aria-expanded={secoesAbertas.fotos}
                  title={secoesAbertas.fotos ? "Fechar" : "Abrir"}
                  className="h-8 w-8 shrink-0 text-slate-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarSecao("fotos");
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${secoesAbertas.fotos ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            {secoesAbertas.fotos && <CardContent className="pt-6">
              {fotos.length === 0 ? (
                <p className="text-[10px] font-bold uppercase italic text-slate-400">
                  Esta OS ainda não tem fotos anexadas.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {fotos.map((f: any) => {
                    const marcada = fotosSelecionadas.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => alternarFoto(f.id)}
                        className={`group relative overflow-hidden rounded-lg border-2 text-left transition-all ${
                          marcada ? "border-primary ring-2 ring-primary/30" : "border-border"
                        }`}
                      >
                        <img
                          src={f.url || ""}
                          alt={f.legenda || "Foto da OS"}
                          loading="lazy"
                          className="h-28 w-full object-cover"
                        />
                        <span className="absolute left-2 top-2">
                          <Checkbox checked={marcada} className="bg-white" />
                        </span>
                        <span className="block bg-slate-900/80 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white truncate">
                          {f.legenda || f.categoria || "Foto"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>}
          </Card>

          {/* Condições comerciais */}
          <Card className="border-border shadow-md">
            <CardHeader
              className="cursor-pointer bg-slate-50 border-b border-border/50"
              onClick={() => alternarSecao("condicoes")}
            >
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Percent className="h-4 w-4 shrink-0 text-primary" /> Condições comerciais (padrão da empresa)
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={secoesAbertas.condicoes ? "Fechar condições comerciais" : "Abrir condições comerciais"}
                  aria-expanded={secoesAbertas.condicoes}
                  title={secoesAbertas.condicoes ? "Fechar" : "Abrir"}
                  className="h-8 w-8 shrink-0 text-slate-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarSecao("condicoes");
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${secoesAbertas.condicoes ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            {secoesAbertas.condicoes && <CardContent className="pt-6 space-y-4">
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
            </CardContent>}
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
                  <span>Custo total real</span>
                  <span className="text-red-400">{brl(totais.custoTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Venda dos itens reais</span>
                  <span className="text-white">{brl(totais.vendaItens)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Itens de proposta</span>
                  <span className="text-amber-400">{brl(totalLivres)}</span>
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

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Comissão do vendedor</p>
                <Input
                  type="number"
                  step="0.01"
                  value={
                    totais.comissaoAjustada
                      ? String(condicoes.comissaoManual ?? "")
                      : totais.comissaoRegra.valor.toFixed(2)
                  }
                  onChange={(e) =>
                    setCondicoes({
                      ...condicoes,
                      comissaoManual: e.target.value === "" ? null : num(e.target.value),
                    })
                  }
                  className={`h-10 bg-slate-800 border-white/10 text-white font-black ${
                    totais.comissaoAjustada ? "ring-1 ring-primary border-primary" : ""
                  }`}
                />
                <p className="text-[10px] font-medium text-slate-400">{totais.comissao.descricao}</p>
                {totais.comissaoAjustada && (
                  <button
                    className="text-[9px] font-black uppercase tracking-widest text-primary"
                    onClick={() => setCondicoes({ ...condicoes, comissaoManual: null })}
                  >
                    Voltar à regra do vendedor ({brl(totais.comissaoRegra.valor)})
                  </button>
                )}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Mostrar no orçamento
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {condicoes.comissaoVisivel ? "Visível no PDF" : "Oculto no PDF"}
                    </p>
                  </div>
                  <Switch
                    checked={!!condicoes.comissaoVisivel}
                    onCheckedChange={(v) => setCondicoes({ ...condicoes, comissaoVisivel: v })}
                  />
                </div>
              </div>

              <Button
                disabled={salvando}
                onClick={gerarPdf}
                variant="outline"
                className="w-full h-11 border-white/20 bg-transparent text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
              >
                <FileText className="mr-2 h-4 w-4 text-primary" /> Gerar PDF da proposta
              </Button>

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

      {/* Edição pontual da empresa */}
      <Dialog open={dialogEmpresa} onOpenChange={setDialogEmpresa}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-tight">Dados da empresa nesta proposta</DialogTitle>
            <DialogDescription>
              As alterações valem apenas para este orçamento. O cadastro da empresa não muda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["nome", "Nome fantasia"],
                ["razao_social", "Razão social"],
                ["cnpj", "CNPJ"],
                ["telefone", "Telefone"],
                ["email", "E-mail"],
                ["site", "Site"],
              ] as [keyof EmpresaSnapshot, string][]
            ).map(([campo, label]) => (
              <div key={campo} className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-500">{label}</Label>
                <Input
                  value={(empresaEdit ?? empresaProposta)[campo] || ""}
                  onChange={(e) =>
                    setEmpresaEdit({ ...(empresaEdit ?? empresaProposta), [campo]: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-500">Endereço</Label>
              <Input
                value={(empresaEdit ?? empresaProposta).endereco || ""}
                onChange={(e) =>
                  setEmpresaEdit({ ...(empresaEdit ?? empresaProposta), endereco: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogEmpresa(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edição pontual do vendedor */}
      <Dialog open={dialogVendedor} onOpenChange={setDialogVendedor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-tight">Vendedor nesta proposta</DialogTitle>
            <DialogDescription>
              As alterações valem apenas para este orçamento. O cadastro do vendedor não muda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {(
              [
                ["nome", "Nome"],
                ["telefone", "Telefone"],
                ["email", "E-mail"],
              ] as [keyof VendedorSnapshot, string][]
            ).map(([campo, label]) => (
              <div key={campo} className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-500">{label}</Label>
                <Input
                  value={(vendedorEdit ?? vendedorProposta)[campo] || ""}
                  onChange={(e) =>
                    setVendedorEdit({ ...(vendedorEdit ?? vendedorProposta), [campo]: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogVendedor(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
