/**
 * Regras de comissão de vendedores (Alternativa Hidráulica).
 * Os dados vêm da tabela public.vendedores no banco oficial.
 */

export type TipoComissao =
  | "percentual_os"
  | "valor_fixo"
  | "margem_bruta"
  | "metas";

export const TIPOS_COMISSAO: { valor: TipoComissao; label: string; ajuda: string }[] = [
  {
    valor: "percentual_os",
    label: "Percentual sobre o total da OS",
    ajuda: "Percentual fixo aplicado sobre o valor total faturado do orçamento.",
  },
  {
    valor: "valor_fixo",
    label: "Valor fixo (R$)",
    ajuda: "Valor definido pelo vendedor, lançado como custo no orçamento.",
  },
  {
    valor: "margem_bruta",
    label: "Percentual sobre a margem bruta",
    ajuda: "Incide sobre (Valor da OS − Custo de peças − Custo de terceirizados).",
  },
  {
    valor: "metas",
    label: "Por metas (faixas)",
    ajuda:
      "Até R$ 50.000 = 3% · de R$ 50.001 a R$ 100.000 = 5% · acima de R$ 100.000 = 7% (faturamento acumulado do mês).",
  },
];

/** Faixas padrão de metas, iguais para todos os vendedores. */
export const FAIXAS_METAS = [
  { ate: 50000, percentual: 3 },
  { ate: 100000, percentual: 5 },
  { ate: Infinity, percentual: 7 },
];

export function percentualPorMeta(faturamentoMes: number): number {
  const faixa = FAIXAS_METAS.find((f) => faturamentoMes <= f.ate);
  return faixa ? faixa.percentual : 7;
}

export type VendedorComissao = {
  nome?: string | null;
  tipo_comissao?: string | null;
  percentual?: number | string | null;
  valor_comissao?: number | string | null;
};

export type BaseCalculo = {
  /** Valor total de venda do orçamento/OS. */
  valorOS: number;
  /** Custo de peças lançado na OS. */
  custoPecas?: number;
  /** Custo de serviços terceirizados lançado na OS. */
  custoTerceiros?: number;
  /** Faturamento acumulado do vendedor no mês (para o tipo "metas"). */
  faturamentoMes?: number;
};

export type ResultadoComissao = {
  tipo: TipoComissao;
  valor: number;
  percentualAplicado: number | null;
  descricao: string;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

export function calcularComissao(
  vendedor: VendedorComissao | null | undefined,
  base: BaseCalculo,
): ResultadoComissao {
  const tipo = (vendedor?.tipo_comissao as TipoComissao) || "percentual_os";
  const percentual = num(vendedor?.percentual);
  const valorFixo = num(vendedor?.valor_comissao);
  const valorOS = num(base.valorOS);

  if (!vendedor) {
    return { tipo, valor: 0, percentualAplicado: null, descricao: "Sem vendedor vinculado" };
  }

  switch (tipo) {
    case "valor_fixo":
      return {
        tipo,
        valor: valorFixo,
        percentualAplicado: null,
        descricao: "Valor fixo definido no cadastro",
      };

    case "margem_bruta": {
      const margem = Math.max(
        0,
        valorOS - num(base.custoPecas) - num(base.custoTerceiros),
      );
      return {
        tipo,
        valor: margem * (percentual / 100),
        percentualAplicado: percentual,
        descricao: `${percentual}% sobre a margem bruta (R$ ${margem.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
      };
    }

    case "metas": {
      const pct = percentualPorMeta(num(base.faturamentoMes));
      return {
        tipo,
        valor: valorOS * (pct / 100),
        percentualAplicado: pct,
        descricao: `Faixa de meta atingida: ${pct}% sobre o total da OS`,
      };
    }

    case "percentual_os":
    default:
      return {
        tipo: "percentual_os",
        valor: valorOS * (percentual / 100),
        percentualAplicado: percentual,
        descricao: `${percentual}% sobre o total da OS`,
      };
  }
}

export function rotuloComissao(v: VendedorComissao): string {
  const tipo = (v.tipo_comissao as TipoComissao) || "percentual_os";
  const pct = num(v.percentual);
  switch (tipo) {
    case "valor_fixo":
      return `R$ ${num(v.valor_comissao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} fixos`;
    case "margem_bruta":
      return `${pct}% da margem bruta`;
    case "metas":
      return "Por metas (3% / 5% / 7%)";
    default:
      return `${pct}% do total da OS`;
  }
}
