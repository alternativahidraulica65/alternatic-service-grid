import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { temLaudo } from "@/lib/os-fluxo";
import { getExecutorEmail } from "@/lib/log-executor";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cog,
  DollarSign,
  Lock,
  Package,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
} from "lucide-react";

const STATUS_PECA_FINAL = ["concluida", "finalizada", "entregue", "cancelada"];

type Situacao = "pendente" | "atrasado" | "concluido";

interface Item {
  id: string;
  titulo: string;
  detalhe?: string | null;
  situacao: Situacao;
  acaoLabel?: string | undefined;
  onAcao?: (() => void | Promise<void>) | undefined;
  irPara?: string | undefined;
  extra?: { label: string; onClick: () => void | Promise<void> } | null;
  removivel?: (() => void | Promise<void>) | null;
  /** Retorna null se o item pode ser concluído, ou a mensagem do que falta. */
  verificar?: (() => string | null) | undefined;
}

interface Bloco {
  chave: string;
  titulo: string;
  icone: React.ReactNode;
  itens: Item[];
}

interface Props {
  osId: string;
  os: any;
  profile: any;
  onIrParaAba: (aba: string) => void;
}

const dataBr = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR") : "—";

export function GuiaExecucaoOs({ osId, os, profile, onIrParaAba }: Props) {
  const queryClient = useQueryClient();
  const { isGestor, isDiretor, isFinanceiro, isDev } = useUserRole();
  const podeVer = isGestor || isDiretor || isFinanceiro || isDev;

  const [dialogAberto, setDialogAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState({ titulo: "", descricao: "", prazo: "", responsavel: "" });
  const [alertaConclusao, setAlertaConclusao] = useState<{ aberto: boolean; itens: string[] }>({
    aberto: false,
    itens: [],
  });
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [alertaItem, setAlertaItem] = useState<{
    aberto: boolean;
    titulo: string;
    motivo: string;
    irPara?: string | undefined;
  }>({ aberto: false, titulo: "", motivo: "" });

  const { data: pecas = [], isLoading: loadingPecas } = useQuery({
    queryKey: ["os_pecas", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_pecas_rastreio" as any)
        .select("*")
        .eq("os_id", osId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: podeVer && !!osId,
  });

  const { data: custos = [], isLoading: loadingCustos } = useQuery({
    queryKey: ["os_custos", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos" as any)
        .select("*")
        .eq("os_id", osId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: podeVer && !!osId,
  });

  const { data: checklist = [], isLoading: loadingChecklist } = useQuery({
    queryKey: ["os_checklist_guia", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_checklist_tecnico" as any)
        .select("id, componente, estado, estado_atual")
        .eq("os_id", osId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: podeVer && !!osId,
  });

  const { data: bancadas = [] } = useQuery({
    queryKey: ["bancadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bancadas" as any)
        .select("id, codigo, nome, tecnico_nome")
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
    enabled: podeVer,
  });

  const { data: tarefas = [], isLoading: loadingTarefas } = useQuery({
    queryKey: ["os_tarefas", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_tarefas" as any)
        .select("*")
        .eq("os_id", osId)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: podeVer && !!osId,
  });

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ["os_pecas", osId] });
    queryClient.invalidateQueries({ queryKey: ["os_custos", osId] });
    queryClient.invalidateQueries({ queryKey: ["os_terceiros", osId] });
    queryClient.invalidateQueries({ queryKey: ["os_historico", osId] });
    queryClient.invalidateQueries({ queryKey: ["os_tarefas", osId] });
    queryClient.invalidateQueries({ queryKey: ["bancadas_fila"] });
  };

  const registrarLog = async (observacao: string, statusAnterior?: string | null, statusNovo?: string | null) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("historico_status_os" as any).insert({
        os_id: osId,
        status_anterior: statusAnterior ?? os?.status ?? null,
        status_novo: statusNovo ?? os?.status ?? "em_andamento",
        observacao,
        executor_id: auth?.user?.id ?? null,
        executor_email: await getExecutorEmail(),
      });
    } catch {
      /* log é complementar, não bloqueia a ação */
    }
  };

  const obterPendenciasObrigatorias = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const lista = pecas as any[];
    const listaCustos = custos as any[];
    const pendencias: string[] = [];

    const checklistPreenchido =
      checklist.length > 0 && checklist.every((c: any) => c.estado || c.estado_atual);
    if (!checklistPreenchido) pendencias.push("Vistoria técnica (checklist) não finalizada");

    const laudoOk = (() => {
      if (temLaudo(os)) return true;
      const bruto = String(os?.observacoes ?? "");
      if (!bruto.trim()) return false;
      try {
        const j = JSON.parse(bruto);
        return Boolean(j?.diagnostico || j?.defeitos || j?.servicos_necessarios);
      } catch {
        return false;
      }
    })();
    if (!laudoOk) pendencias.push("Laudo técnico não preenchido");

    const orcamentoOk = Number(os?.valor_total ?? 0) > 0;
    if (!orcamentoOk) pendencias.push("Orçamento não gerado");

    const aprovado = ["aprovada", "usinagem", "montagem", "pronto", "entregue", "encerrado", "faturamento"].includes(
      String(os?.status ?? ""),
    );
    if (!aprovado) pendencias.push("Aprovação do cliente não registrada");

    const pecasSemDestino = lista.filter(
      (p: any) => !p.status_peca || p.status_peca === "Pendente de Destinação",
    );
    if (pecasSemDestino.length > 0) {
      pendencias.push(`${pecasSemDestino.length} peça(s) sem destinação definida`);
    }

    const terceirosPendentes = lista.filter(
      (p: any) =>
        String(p.status_peca ?? "").toLowerCase().includes("terceiro") && !p.terceiro_recebido_em,
    );
    if (terceirosPendentes.length > 0) {
      pendencias.push(`${terceirosPendentes.length} peça(s) enviada(s) a terceiros não recebida(s)`);
    }

    const bancadasPendentes = lista.filter(
      (p: any) =>
        p.bancada_id && !STATUS_PECA_FINAL.includes(String(p.status_peca ?? "").toLowerCase()),
    );
    if (bancadasPendentes.length > 0) {
      pendencias.push(`${bancadasPendentes.length} serviço(s) em bancada não concluído(s)`);
    }

    const custosSemValor = listaCustos.filter((c: any) => !Number(c.custo_interno ?? 0));
    if (custosSemValor.length > 0) {
      pendencias.push(`${custosSemValor.length} custo(s) sem valor lançado`);
    }

    const custosNaoPagos = listaCustos.filter(
      (c: any) => Number(c.custo_interno ?? 0) > 0 && !c.pago,
    );
    if (custosNaoPagos.length > 0) {
      pendencias.push(`${custosNaoPagos.length} custo(s) em aberto não pago(s)`);
    }

    return pendencias;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecas, custos, checklist, os]);

  const osEstaEncerrada = ["encerrado", "entregue", "cancelada"].includes(String(os?.status ?? ""));

  const alternarConclusaoOs = async (marcarConcluida: boolean) => {
    if (marcarConcluida) {
      const pendencias = obterPendenciasObrigatorias;
      if (pendencias.length > 0) {
        setAlertaConclusao({ aberto: true, itens: pendencias });
        return;
      }
    }

    setAtualizandoStatus(true);
    const statusAnterior = String(os?.status ?? "");
    const statusNovo = marcarConcluida ? "encerrado" : "pronto";

    const { error } = await supabase
      .from("ordens_servico" as any)
      .update({ status: statusNovo, data_encerramento: marcarConcluida ? new Date().toISOString() : null })
      .eq("id", osId);

    setAtualizandoStatus(false);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }

    await registrarLog(
      marcarConcluida ? "OS concluída pelo gestor" : "OS reaberta pelo gestor",
      statusAnterior,
      statusNovo,
    );

    queryClient.invalidateQueries({ queryKey: ["os", osId] });
    queryClient.invalidateQueries({ queryKey: ["os_historico", osId] });
    toast.success(marcarConcluida ? "OS concluída com sucesso" : "OS reaberta");
  };

  const atualizarPeca = async (pecaId: string, updates: any, msg: string, log?: string) => {
    const { error } = await supabase
      .from("os_pecas_rastreio" as any)
      .update(updates)
      .eq("id", pecaId);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    if (log) await registrarLog(log);
    invalidarTudo();
    toast.success(msg);
  };

  const criarTarefa = async () => {
    if (!nova.titulo.trim()) {
      toast.error("Informe o título da tarefa");
      return;
    }
    setSalvando(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("os_tarefas" as any).insert({
      os_id: osId,
      titulo: nova.titulo.trim(),
      descricao: [nova.descricao.trim(), nova.responsavel.trim() ? `Responsável: ${nova.responsavel.trim()}` : ""]
        .filter(Boolean)
        .join(" • ") || null,
      prazo: nova.prazo || null,
      criado_por: auth?.user?.id ?? null,
    });
    setSalvando(false);
    if (error) {
      toast.error("Erro ao criar tarefa: " + error.message);
      return;
    }
    await registrarLog(`Tarefa criada no guia de execução: "${nova.titulo.trim()}"`);
    setNova({ titulo: "", descricao: "", prazo: "", responsavel: "" });
    setDialogAberto(false);
    invalidarTudo();
    toast.success("Tarefa adicionada");
  };

  const alternarTarefa = async (t: any) => {
    const { data: auth } = await supabase.auth.getUser();
    const concluida = !t.concluida;
    const { error } = await supabase
      .from("os_tarefas" as any)
      .update({
        concluida,
        concluida_em: concluida ? new Date().toISOString() : null,
        concluida_por: concluida ? auth?.user?.id ?? null : null,
      })
      .eq("id", t.id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await registrarLog(
      `${concluida ? "Tarefa concluída" : "Tarefa reaberta"} no guia de execução: "${t.titulo}"`,
    );
    invalidarTudo();
    toast.success(concluida ? "Tarefa concluída" : "Tarefa reaberta");
  };

  const excluirTarefa = async (t: any) => {
    const { error } = await supabase.from("os_tarefas" as any).delete().eq("id", t.id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await registrarLog(`Tarefa removida do guia de execução: "${t.titulo}"`);
    invalidarTudo();
    toast.success("Tarefa removida");
  };

  const confirmarItem = (item: Item) => {
    const motivo = item.verificar?.() ?? null;
    if (motivo) {
      setAlertaItem({ aberto: true, titulo: item.titulo, motivo, irPara: item.irPara });
      return;
    }
    invalidarTudo();
    toast.success(`"${item.titulo}" confirmado como concluído`);
  };

  const blocos = useMemo<Bloco[]>(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const lista = pecas as any[];
    const listaCustos = custos as any[];
    const bancadaPorId = new Map((bancadas as any[]).map((b: any) => [String(b.id), b]));

    // 1. Fluxo da OS
    const fluxo: Item[] = [];
    const checklistPreenchido =
      (checklist as any[]).length > 0 &&
      (checklist as any[]).every((c: any) => c.estado || c.estado_atual);
    fluxo.push({
      id: "fluxo-checklist",
      titulo: "Vistoria técnica (checklist)",
      detalhe: (checklist as any[]).length
        ? `${(checklist as any[]).filter((c: any) => c.estado || c.estado_atual).length} de ${(checklist as any[]).length} itens avaliados`
        : "Nenhum item avaliado ainda",
      situacao: checklistPreenchido ? "concluido" : "pendente",
      irPara: "checklist",
      verificar: () =>
        checklistPreenchido
          ? null
          : "A vistoria técnica ainda não foi finalizada. Avalie todos os itens do checklist antes de concluir esta etapa.",
    });

    const laudoOk = (() => {
      if (temLaudo(os)) return true;
      // Fallback: laudos antigos salvos como JSON em "observacoes"
      const bruto = String(os?.observacoes ?? "");
      if (!bruto.trim()) return false;
      try {
        const j = JSON.parse(bruto);
        return Boolean(j?.diagnostico || j?.defeitos || j?.servicos_necessarios);
      } catch {
        return false;
      }
    })();
    fluxo.push({
      id: "fluxo-laudo",
      titulo: "Laudo técnico preenchido",
      detalhe: laudoOk ? "Laudo registrado" : "Diagnóstico, defeitos e serviços necessários",
      situacao: laudoOk ? "concluido" : "pendente",
      irPara: "laudo-técnico",
      verificar: () =>
        laudoOk
          ? null
          : "O laudo técnico ainda não foi preenchido. Registre diagnóstico, defeitos e serviços necessários na aba Laudo Técnico.",
    });

    const prazoOrc = os?.prazo_orcamento ? new Date(os.prazo_orcamento) : null;
    const aprovado = ["aprovada", "usinagem", "montagem", "pronto", "entregue", "encerrado", "faturamento"].includes(
      String(os?.status ?? ""),
    );
    // Concluído por ação do Financeiro/Diretor (impressão do orçamento) — somente acompanhamento aqui.
    const orcamentoOk = aprovado || !!os?.orcamento_enviado_em;
    fluxo.push({
      id: "fluxo-orcamento",
      titulo: orcamentoOk ? "Orçamento gerado" : "Orçamento pendente (Financeiro/Diretor)",
      detalhe: orcamentoOk
        ? `Gerado em ${dataBr(os?.orcamento_enviado_em) || "—"}`
        : prazoOrc ? `Prazo do orçamento: ${dataBr(os.prazo_orcamento)}` : "Sem prazo definido",
      situacao: orcamentoOk
        ? "concluido"
        : prazoOrc && prazoOrc.getTime() < Date.now()
          ? "atrasado"
          : "pendente",
      irPara: "orçamento",
    });

    fluxo.push({
      id: "fluxo-aprovacao",
      titulo: aprovado ? "Serviço aprovado pelo cliente" : "Aprovação pendente",
      detalhe: aprovado ? "Execução liberada" : "Aguardando o cliente aprovar a execução do serviço",
      situacao: aprovado ? "concluido" : "pendente",
      irPara: "aprovação",
    });

    // 2. Peças
    const pecasItens: Item[] = lista.map((p: any) => {
      const semDestino = !p.status_peca || p.status_peca === "Pendente de Destinação";
      const armazenada = String(p.status_peca ?? "").toLowerCase().includes("armazen");
      return {
        id: `peca-${p.id}`,
        titulo: p.nome ?? "Peça",
        detalhe: semDestino
          ? "Definir destinação (comprar, usinar, terceiros ou armazenar)"
          : armazenada
            ? `Armazenada em: ${p.localizacao_fisica || p.localizacao || "local não informado"}`
            : `${p.status_peca}${p.localizacao_fisica || p.localizacao ? ` • ${p.localizacao_fisica || p.localizacao}` : ""}`,
        situacao: semDestino ? "pendente" : "concluido",
        irPara: "peças",
        verificar: () =>
          semDestino
            ? "A peça ainda não tem destinação definida. Defina na aba Peças (comprar, usinar, terceiros ou armazenar)."
            : null,
      };
    });

    // 3. Terceiros
    const terceirosItens: Item[] = lista
      .filter((p: any) => String(p.status_peca ?? "").toLowerCase().includes("terceiro"))
      .map((p: any) => {
        const recebido = !!p.terceiro_recebido_em;
        const prazo = p.terceiro_prazo_entrega ? new Date(p.terceiro_prazo_entrega) : null;
        const atrasado = !recebido && !!prazo && prazo.getTime() < hoje.getTime();
        return {
          id: `terceiro-${p.id}`,
          titulo: `${p.nome ?? "Peça"} — ${p.terceiro_nome || "terceiro não informado"}`,
          detalhe: recebido
            ? `Recebida em ${dataBr(p.terceiro_recebido_em)}`
            : `Prazo prometido: ${prazo ? dataBr(p.terceiro_prazo_entrega) : "não informado"}${atrasado ? " • em atraso" : ""}`,
          situacao: recebido ? "concluido" : atrasado ? "atrasado" : "pendente",
          acaoLabel: recebido ? undefined : "Marcar recebida",
          onAcao: recebido
            ? undefined
            : () =>
                atualizarPeca(
                  p.id,
                  {
                    status_peca: "Recebido de Terceiros",
                    terceiro_recebido_em: new Date().toISOString(),
                    terceiro_recebido_por: profile?.user_id ?? null,
                  },
                  "Peça recebida do terceiro",
                  `Baixa de terceiros: "${p.nome ?? "Peça"}" recebida de ${p.terceiro_nome || "terceiro"}.`,
                ),
          irPara: "terceiros",
        };
      });

    // 4. Usinagem / bancadas
    const bancadaItens: Item[] = lista
      .filter((p: any) => p.bancada_id)
      .map((p: any) => {
        const b = bancadaPorId.get(String(p.bancada_id));
        const concluida = STATUS_PECA_FINAL.includes(String(p.status_peca ?? "").toLowerCase());
        return {
          id: `bancada-${p.id}`,
          titulo: `${p.nome ?? "Serviço"} — ${b?.codigo ?? "Bancada"}`,
          detalhe: concluida
            ? "Serviço concluído"
            : p.aprovado_gestor
              ? `Liberado para execução${b?.tecnico_nome ? ` • ${b.tecnico_nome}` : ""}`
              : "Aguardando aprovação do gestor",
          situacao: concluida ? "concluido" : p.aprovado_gestor ? "pendente" : "atrasado",
          acaoLabel: concluida ? undefined : p.aprovado_gestor ? "Dar baixa" : "Aprovar",
          onAcao: concluida
            ? undefined
            : p.aprovado_gestor
              ? () =>
                  atualizarPeca(
                    p.id,
                    { status_peca: "concluida" },
                    "Baixa registrada",
                    `Baixa de usinagem: serviço "${p.nome ?? "Peça"}" concluído na bancada ${b?.codigo ?? ""}.`,
                  )
              : () =>
                  atualizarPeca(
                    p.id,
                    { aprovado_gestor: true },
                    "Serviço liberado",
                    `Serviço "${p.nome ?? "Peça"}" liberado na bancada ${b?.codigo ?? ""}.`,
                  ),
        };
      });

    // 5. Custos
    const custosItens: Item[] = listaCustos.map((c: any) => {
      const semValor = !Number(c.custo_interno ?? 0);
      return {
        id: `custo-${c.id}`,
        titulo: c.descricao ?? "Custo",
        detalhe: semValor
          ? "Valor ainda não lançado"
          : `${Number(c.custo_interno).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} • ${c.pago ? `pago em ${dataBr(c.data_pagamento)}` : "a pagar"}`,
        situacao: semValor ? "pendente" : c.pago ? "concluido" : "pendente",
        irPara: "custos",
        verificar: () =>
          semValor
            ? "O valor do custo ainda não foi lançado. Informe o valor na aba Custos."
            : !c.pago
              ? "O custo tem valor lançado, mas ainda não foi marcado como pago na aba Custos."
              : null,
      };
    });

    // 6. Tarefas manuais
    const tarefaItens: Item[] = (tarefas as any[]).map((t: any) => {
      const prazo = t.prazo ? new Date(`${t.prazo}T00:00:00`) : null;
      const atrasada = !t.concluida && !!prazo && prazo.getTime() < hoje.getTime();
      return {
        id: `tarefa-${t.id}`,
        titulo: t.titulo,
        detalhe: [t.descricao, prazo ? `Prazo: ${prazo.toLocaleDateString("pt-BR")}` : null]
          .filter(Boolean)
          .join(" • ") || null,
        situacao: t.concluida ? "concluido" : atrasada ? "atrasado" : "pendente",
        acaoLabel: t.concluida ? "Reabrir" : "Concluir",
        onAcao: () => alternarTarefa(t),
        removivel: () => excluirTarefa(t),
      };
    });

    return [
      { chave: "fluxo", titulo: "Fluxo da OS", icone: <Activity className="h-4 w-4 text-primary" />, itens: fluxo },
      { chave: "pecas", titulo: "Peças", icone: <Package className="h-4 w-4 text-primary" />, itens: pecasItens },
      { chave: "terceiros", titulo: "Terceiros", icone: <Truck className="h-4 w-4 text-primary" />, itens: terceirosItens },
      { chave: "bancadas", titulo: "Usinagem / Bancadas", icone: <Cog className="h-4 w-4 text-primary" />, itens: bancadaItens },
      { chave: "custos", titulo: "Custos", icone: <DollarSign className="h-4 w-4 text-primary" />, itens: custosItens },
      { chave: "tarefas", titulo: "Tarefas do Gestor", icone: <ClipboardList className="h-4 w-4 text-primary" />, itens: tarefaItens },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecas, custos, checklist, bancadas, tarefas, os]);

  const todos = blocos.flatMap((b) => b.itens);
  const concluidos = todos.filter((i) => i.situacao === "concluido").length;
  const atrasados = todos.filter((i) => i.situacao === "atrasado").length;
  const pendentes = todos.length - concluidos;
  const progresso = todos.length ? Math.round((concluidos / todos.length) * 100) : 0;
  const proximo = todos.find((i) => i.situacao === "atrasado") ?? todos.find((i) => i.situacao === "pendente");

  if (!podeVer) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Lock className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest">
          Guia disponível apenas para gestão
        </p>
      </div>
    );
  }

  if (loadingPecas || loadingCustos || loadingChecklist || loadingTarefas) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Progresso da OS
            </p>
            <p className="text-2xl font-black">{progresso}%</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-black uppercase">
              {concluidos} concluídos
            </Badge>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase">
              {pendentes} pendentes
            </Badge>
            <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] font-black uppercase">
              {atrasados} atrasados
            </Badge>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
              <Checkbox
                id="concluir-os"
                checked={osEstaEncerrada}
                disabled={atualizandoStatus}
                onCheckedChange={(v) => alternarConclusaoOs(Boolean(v))}
              />
              <Label htmlFor="concluir-os" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                OS concluída
              </Label>
            </div>
            <Button
              size="sm"
              className="h-8 text-[10px] font-black uppercase"
              onClick={() => setDialogAberto(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> Nova tarefa
            </Button>
          </div>
        </div>
        <Progress value={progresso} className="h-2" />
        {proximo && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Próximo passo
              </p>
              <p className="text-xs font-bold truncate">{proximo.titulo}</p>
            </div>
          </div>
        )}
      </div>

      {blocos.map((bloco) => (
        <div key={bloco.chave} className="space-y-2">
          <div className="flex items-center gap-2">
            {bloco.icone}
            <p className="text-xs font-black uppercase tracking-widest">{bloco.titulo}</p>
            <span className="text-[10px] font-bold text-muted-foreground">
              {bloco.itens.filter((i) => i.situacao !== "concluido").length} pendente(s)
            </span>
          </div>

          {bloco.itens.length === 0 ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-2">
              Nada registrado aqui
            </p>
          ) : (
            <div className="space-y-2">
              {bloco.itens.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                    item.situacao === "concluido"
                      ? "border-emerald-200 bg-emerald-50/50"
                      : item.situacao === "atrasado"
                        ? "border-red-200 bg-red-50/50"
                        : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {item.situacao === "concluido" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : item.situacao === "atrasado" ? (
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${item.situacao === "concluido" ? "line-through text-muted-foreground" : ""}`}
                      >
                        {item.titulo}
                      </p>
                      {item.detalhe && (
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {item.detalhe}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!item.onAcao && item.verificar && item.situacao !== "concluido" && (
                      <Button
                        size="sm"
                        className="h-7 text-[9px] font-black uppercase"
                        onClick={() => confirmarItem(item)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Concluir
                      </Button>
                    )}
                    {item.acaoLabel && item.onAcao && (
                      <Button
                        size="sm"
                        variant={item.situacao === "concluido" ? "outline" : "default"}
                        className="h-7 text-[9px] font-black uppercase"
                        onClick={() => item.onAcao?.()}
                      >
                        {item.acaoLabel === "Reabrir" && <RotateCcw className="h-3 w-3 mr-1" />}
                        {item.acaoLabel}
                      </Button>
                    )}
                    {item.irPara && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[9px] font-black uppercase"
                        onClick={() => onIrParaAba(item.irPara!)}
                      >
                        Abrir
                      </Button>
                    )}
                    {item.removivel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => item.removivel?.()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-black uppercase tracking-tight">
              Nova tarefa da OS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest">Título</Label>
              <Input
                value={nova.titulo}
                onChange={(e) => setNova((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex.: Enviar haste para cromagem"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest">Responsável</Label>
              <Input
                value={nova.responsavel}
                onChange={(e) => setNova((p) => ({ ...p, responsavel: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest">Prazo</Label>
              <Input
                type="date"
                value={nova.prazo}
                onChange={(e) => setNova((p) => ({ ...p, prazo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest">Observação</Label>
              <Textarea
                value={nova.descricao}
                onChange={(e) => setNova((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <Button
              className="w-full text-[10px] font-black uppercase"
              disabled={salvando}
              onClick={criarTarefa}
            >
              {salvando ? "Salvando..." : "Adicionar tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alertaConclusao.aberto} onOpenChange={(aberto) => setAlertaConclusao((p) => ({ ...p, aberto }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-black uppercase tracking-tight flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Não é possível concluir a OS
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Existem itens obrigatórios pendentes. Resolva-os antes de marcar a OS como concluída.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ul className="space-y-2">
              {alertaConclusao.itens.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs font-medium">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full text-[10px] font-black uppercase"
              onClick={() => setAlertaConclusao({ aberto: false, itens: [] })}
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alertaItem.aberto} onOpenChange={(aberto) => setAlertaItem((p) => ({ ...p, aberto }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-black uppercase tracking-tight flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Não é possível concluir
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {alertaItem.titulo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs font-medium flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              {alertaItem.motivo}
            </p>
            <div className="flex gap-2">
              {alertaItem.irPara && (
                <Button
                  variant="outline"
                  className="flex-1 text-[10px] font-black uppercase"
                  onClick={() => {
                    const aba = alertaItem.irPara!;
                    setAlertaItem({ aberto: false, titulo: "", motivo: "" });
                    onIrParaAba(aba);
                  }}
                >
                  Abrir aba
                </Button>
              )}
              <Button
                className="flex-1 text-[10px] font-black uppercase"
                onClick={() => setAlertaItem({ aberto: false, titulo: "", motivo: "" })}
              >
                Entendi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
