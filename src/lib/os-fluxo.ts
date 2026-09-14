/**
 * Fonte única da sequência (fluxo) de uma Ordem de Serviço.
 *
 * Sequência oficial:
 *   Criar OS > Checklist > Laudo técnico > Custos > Orçamento >
 *   Aprovação do cliente > Execução > Pronto > Entrega
 *
 * Peças, Terceiros e Bancadas NÃO são fases: servem de controle do gestor e
 * só influenciam a conclusão da fase de Execução.
 */

export type Fase =
  | "criacao"
  | "checklist"
  | "laudo"
  | "custos"
  | "orcamento"
  | "aprovacao"
  | "execucao"
  | "pronto"
  | "entrega";

export const FASES: Fase[] = [
  "criacao",
  "checklist",
  "laudo",
  "custos",
  "orcamento",
  "aprovacao",
  "execucao",
  "pronto",
  "entrega",
];

export const ROTULO_FASE: Record<Fase, string> = {
  criacao: "Criação da OS",
  checklist: "Checklist",
  laudo: "Laudo Técnico",
  custos: "Custos",
  orcamento: "Orçamento",
  aprovacao: "Aprovação do Cliente",
  execucao: "Execução",
  pronto: "Pronto",
  entrega: "Entrega",
};

/** Valor mínimo aceito em qualquer custo lançado. */
export const VALOR_MINIMO_CUSTO = 0.5;

const AGUARDANDO_CLIENTE = "aguardando aprovação";

/** Status gravados no banco (inclui legados) mapeados para a fase corrente. */
export function faseDoStatus(status?: string | null, statusFinanceiro?: string | null): Fase {
  const s = String(status ?? "").toLowerCase();
  switch (s) {
    case "":
    case "aberta":
    case "triagem":
      return "criacao";
    case "vistoria":
      // checklist finalizado — falta o laudo
      return "laudo";
    case "aguardando_gestor":
      // laudo finalizado — falta lançar/validar custos
      return "custos";
    case "orcamento_pendente":
      return String(statusFinanceiro ?? "").toLowerCase() === AGUARDANDO_CLIENTE
        ? "aprovacao"
        : "orcamento";
    case "aprovada":
    case "usinagem":
    case "montagem":
    case "execucao":
      return "execucao";
    case "pronto":
      return "pronto";
    case "entregue":
    case "encerrada":
    case "encerrado":
      return "entrega";
    default:
      return "criacao";
  }
}

/** Status que deve ser gravado ao entrar em cada fase. */
export const STATUS_DA_FASE: Record<Fase, string> = {
  criacao: "aberta",
  checklist: "aberta",
  laudo: "vistoria",
  custos: "aguardando_gestor",
  orcamento: "orcamento_pendente",
  aprovacao: "orcamento_pendente",
  execucao: "aprovada",
  pronto: "pronto",
  entrega: "entregue",
};

/** Coluna do quadro (Kanban) correspondente ao status gravado. */
export function colunaDoStatus(status?: string | null, statusFinanceiro?: string | null): string {
  const fase = faseDoStatus(status, statusFinanceiro);
  switch (fase) {
    case "criacao":
    case "checklist":
      return "aberta";
    case "laudo":
      return "vistoria";
    case "custos":
    case "orcamento":
    case "aprovacao":
      return "orcamento_pendente";
    case "execucao":
      return String(status ?? "").toLowerCase() === "montagem" ? "montagem" : "usinagem";
    default:
      return "pronto";
  }
}

export const indiceFase = (fase: Fase) => FASES.indexOf(fase);

const ESTADOS_VALIDOS = ["bom", "ruim", "aprovado", "recuperacao", "danificado", "substituir"];
const estadoDoItem = (item: any) =>
  String(item?.estado_atual ?? item?.estado ?? item?.status ?? "").toLowerCase();

const STATUS_PECA_FINAL = ["concluida", "finalizada", "entregue", "cancelada"];

/** Lê o laudo das colunas oficiais, com fallback para o JSON legado em "observacoes". */
export function lerLaudo(os: any): { diagnostico: string; defeitos: string; servicos_necessarios: string } {
  const diag = os?.laudo_diagnostico ?? "";
  const def = os?.laudo_defeitos ?? "";
  const serv = os?.laudo_servicos_necessarios ?? "";
  if (diag || def || serv) return { diagnostico: diag, defeitos: def, servicos_necessarios: serv };
  const bruto = os?.observacoes ?? os?.observacao ?? "";
  let legado: any = {};
  try {
    legado = bruto ? JSON.parse(bruto) : {};
  } catch {
    legado = { diagnostico: bruto };
  }
  return {
    diagnostico: legado?.diagnostico || "",
    defeitos: legado?.defeitos || "",
    servicos_necessarios: legado?.servicos_necessarios || "",
  };
}

/** Laudo considerado registrado quando há qualquer conteúdo preenchido (fotos não são obrigatórias). */
export function temLaudo(os: any): boolean {
  const l = lerLaudo(os);
  return Boolean(l.diagnostico || l.defeitos || l.servicos_necessarios);
}

export interface DadosFluxo {
  checklist?: any[];
  custos?: any[];
  pecas?: any[];
}

export interface ResultadoFluxo {
  faseAtual: Fase;
  concluidas: Fase[];
  proximaFase: Fase | null;
  /** Pendências por fase — vazio quando a fase está concluída. */
  pendencias: Record<Fase, string[]>;
}

/** Avalia o fluxo de uma OS a partir dos dados reais do banco. */
export function avaliarFluxo(os: any, dados: DadosFluxo = {}): ResultadoFluxo {
  const checklist = dados.checklist ?? [];
  const custos = dados.custos ?? [];
  const pecas = dados.pecas ?? [];

  const faseAtual = faseDoStatus(os?.status, os?.status_financeiro);
  const idxAtual = indiceFase(faseAtual);

  const pendencias: Record<Fase, string[]> = {
    criacao: [],
    checklist: [],
    laudo: [],
    custos: [],
    orcamento: [],
    aprovacao: [],
    execucao: [],
    pronto: [],
    entrega: [],
  };

  // Criação
  if (!os?.cliente && !os?.cliente_id) pendencias.criacao.push("Cliente não informado na OS");

  // Checklist: todos os itens avaliados como Bom ou Ruim + checklist finalizado
  if (checklist.length === 0) {
    pendencias.checklist.push("Nenhum item de checklist avaliado");
  } else {
    const naoAvaliados = checklist.filter((i) => !ESTADOS_VALIDOS.includes(estadoDoItem(i)));
    if (naoAvaliados.length > 0) {
      pendencias.checklist.push(
        `${naoAvaliados.length} item(ns) do checklist sem avaliação (Bom ou Ruim)`,
      );
    }
  }
  if (idxAtual < indiceFase("laudo")) {
    pendencias.checklist.push('Checklist ainda não finalizado (botão "Finalizar Checklist")');
  }

  // Laudo técnico (colunas oficiais ou JSON legado em "observacoes")
  const laudoOk = temLaudo(os);
  if (!laudoOk) pendencias.laudo.push("Laudo/relatório técnico ainda não registrado");

  // Custos: nada abaixo de R$ 0,50; lista vazia é permitida
  const valorDoCusto = (c: any) => {
    const venda = Number(c?.preco_venda_final ?? c?.valor_venda ?? 0);
    const interno = Number(c?.custo_interno ?? 0);
    return Math.max(venda, interno);
  };
  const custosZerados = custos.filter((c) => valorDoCusto(c) < VALOR_MINIMO_CUSTO);
  if (custosZerados.length > 0) {
    pendencias.custos.push(
      `${custosZerados.length} custo(s) sem valor válido — mínimo de R$ 0,50 por item`,
    );
  }

  // Orçamento
  if (!(Number(os?.valor_total ?? 0) > 0 || Number(os?.valor_final ?? 0) > 0)) {
    pendencias.orcamento.push("Orçamento ainda não gerado com valor");
  }

  // Aprovação do cliente
  if (idxAtual < indiceFase("execucao")) {
    pendencias.aprovacao.push("Aprovação do cliente ainda não registrada");
  }

  // Execução (peças, terceiros e bancadas)
  const semDestino = pecas.filter(
    (p) => !p.status_peca || p.status_peca === "Pendente de Destinação",
  );
  if (semDestino.length > 0) {
    pendencias.execucao.push(`${semDestino.length} peça(s) sem destinação definida`);
  }
  const terceirosAbertos = pecas.filter(
    (p) =>
      String(p.status_peca ?? "").toLowerCase().includes("terceiro") &&
      !p.terceiro_recebido_em &&
      String(p.status_peca ?? "").toLowerCase() !== "recebido de terceiros",
  );
  if (terceirosAbertos.length > 0) {
    pendencias.execucao.push(`${terceirosAbertos.length} peça(s) ainda com terceiros`);
  }
  const bancadaAberta = pecas.filter(
    (p) => p.bancada_id && !STATUS_PECA_FINAL.includes(String(p.status_peca ?? "").toLowerCase()),
  );
  if (bancadaAberta.length > 0) {
    pendencias.execucao.push(`${bancadaAberta.length} serviço(s) de bancada sem baixa`);
  }

  // Pronto / Entrega
  if (!os?.testado) pendencias.pronto.push("Serviço ainda não testado");
  if (!os?.data_entrega) pendencias.entrega.push("Data de entrega não informada");
  if (!os?.entregue_por) pendencias.entrega.push("Responsável pela entrega não informado");

  const concluidas = FASES.filter((f) => {
    if (pendencias[f].length > 0) return false;
    return indiceFase(f) < idxAtual || (f === faseAtual && idxAtual === indiceFase("entrega"));
  });

  const proximaFase = FASES[Math.min(idxAtual + 1, FASES.length - 1)] ?? null;

  return { faseAtual, concluidas, proximaFase, pendencias };
}

/**
 * Pendências que impedem a OS de chegar à fase desejada
 * (todas as fases anteriores precisam estar limpas).
 */
export function pendenciasAte(fase: Fase, resultado: ResultadoFluxo): string[] {
  const limite = indiceFase(fase);
  return FASES.slice(0, limite).flatMap((f) =>
    resultado.pendencias[f].map((p) => `${ROTULO_FASE[f]}: ${p}`),
  );
}

/** Voltar fase é sempre permitido; avançar exige as fases anteriores concluídas. */
export function podeAvancar(
  de: Fase,
  para: Fase,
  resultado: ResultadoFluxo,
): { ok: boolean; pendencias: string[] } {
  if (indiceFase(para) <= indiceFase(de)) return { ok: true, pendencias: [] };
  const pendencias = pendenciasAte(para, resultado);
  return { ok: pendencias.length === 0, pendencias };
}
