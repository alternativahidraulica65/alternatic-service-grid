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

export function encontrarReceitaPorMargem(
  margemDesejada: number,
  calcularMargem: (receita: number) => number,
  piso: number,
) {
  const alvo = Math.min(99, Math.max(-99, margemDesejada));
  let minimo = Math.max(0.01, piso);
  let maximo = Math.max(minimo * 2, 100);

  for (let i = 0; i < 80 && calcularMargem(maximo) < alvo; i += 1) maximo *= 2;
  if (calcularMargem(maximo) < alvo) return maximo;

  for (let i = 0; i < 80; i += 1) {
    const meio = (minimo + maximo) / 2;
    if (calcularMargem(meio) < alvo) minimo = meio;
    else maximo = meio;
  }
  return maximo;
}