export type ItemOrcamento = {
  tipo_item?: string | null;
  quantidade?: number | string | null;
  valor_unitario?: number | string | null;
  custo_unitario?: number | string | null;
  margem_percentual?: number | string | null;
};

const numero = (valor: unknown) => Number(valor ?? 0) || 0;

export function precoVendaProduto(item: ItemOrcamento) {
  const custo = numero(item.custo_unitario);
  const margem = numero(item.margem_percentual);
  return custo * (1 + margem / 100);
}

export function totalProduto(item: ItemOrcamento) {
  return (numero(item.quantidade) || 1) * precoVendaProduto(item);
}

export function custoTotalProduto(item: ItemOrcamento) {
  return (numero(item.quantidade) || 1) * numero(item.custo_unitario);
}

export function totalItemProposta(item: ItemOrcamento) {
  return (numero(item.quantidade) || 1) * numero(item.valor_unitario);
}

export function calcularResultadoLiquido({
  receita,
  custoManutencao,
  custoProdutos,
  impostoPercentual,
  comissao,
}: {
  receita: number;
  custoManutencao: number;
  custoProdutos: number;
  impostoPercentual: number;
  comissao: number;
}) {
  const imposto = receita * (impostoPercentual / 100);
  const custoDireto = custoManutencao + custoProdutos;
  const lucro = receita - imposto - custoDireto - comissao;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  return { imposto, custoDireto, lucro, margem };
}

export const arredondar2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Preço por Mark-up divisor: Preço = (Custos + Comissão fixa) / (1 - Imposto% - Margem%).
 * A comissão pode depender do próprio preço (faixas/percentual); resolve por ponto fixo
 * determinístico, que converge rapidamente para o valor exato.
 */
export function precoPorMarkup({
  custoDireto,
  impostoPercentual,
  margemDesejada,
  comissaoPara,
}: {
  custoDireto: number;
  impostoPercentual: number;
  margemDesejada: number;
  comissaoPara: (receita: number) => number;
}) {
  const divisor = 1 - impostoPercentual / 100 - Math.min(99, Math.max(-99, margemDesejada)) / 100;
  if (divisor <= 0.0001) return 0;
  let preco = custoDireto / divisor;
  for (let i = 0; i < 30; i += 1) {
    const proximo = (custoDireto + comissaoPara(preco)) / divisor;
    if (Math.abs(proximo - preco) < 0.0001) {
      preco = proximo;
      break;
    }
    preco = proximo;
  }
  return arredondar2(Math.max(0, preco));
}