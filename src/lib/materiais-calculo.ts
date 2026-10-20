export type Formato = "redondo" | "tubo";

export type PrecoReferencia = {
  id: string;
  especificacao: string;
  acabamento: string | null;
  formato: string;
  diametro_mm: number | null;
  diametro_int_mm: number | null;
  faixa_min_mm: number | null;
  faixa_max_mm: number | null;
  densidade: number;
  preco_kg: number;
  ipi_percentual: number;
  ativo: boolean;
};

const TOL = 0.1; // mm de tolerância para considerar mesma medida

/** Peso teórico por peça (kg). Medidas em mm, densidade em g/cm³. Retorna null se inválido. */
export function pesoTeorico(formato: Formato, dExt: number, comprimento: number, densidade: number, dInt = 0): number | null {
  if (!(dExt > 0) || !(comprimento > 0) || !(densidade > 0)) return null;
  if (formato === "tubo") {
    if (!(dInt > 0) || dInt >= dExt) return null;
    return (Math.PI * (dExt * dExt - dInt * dInt) * comprimento * densidade) / 4_000_000;
  }
  if (formato === "redondo") return (Math.PI * dExt * dExt * comprimento * densidade) / 4_000_000;
  return null;
}

/** Busca estrita: 1) medida exata documentada 2) faixa cadastrada. Nunca interpola. */
export function encontrarPreco(
  tabela: PrecoReferencia[],
  especificacao: string,
  acabamento: string | null,
  formato: Formato,
  dExt: number,
  dInt = 0,
): { regra: PrecoReferencia; tipo: "exata" | "faixa" } | null {
  const base = tabela.filter(
    (r) => r.ativo && r.especificacao === especificacao && (r.acabamento ?? "") === (acabamento ?? "") && r.formato === formato,
  );
  const exata = base.find(
    (r) =>
      r.diametro_mm != null &&
      Math.abs(Number(r.diametro_mm) - dExt) <= TOL &&
      (formato !== "tubo" || (r.diametro_int_mm != null && Math.abs(Number(r.diametro_int_mm) - dInt) <= TOL)),
  );
  if (exata) return { regra: exata, tipo: "exata" };
  const faixa = base.find(
    (r) => r.faixa_min_mm != null && r.faixa_max_mm != null && dExt >= Number(r.faixa_min_mm) && dExt <= Number(r.faixa_max_mm),
  );
  if (faixa) return { regra: faixa, tipo: "faixa" };
  return null;
}

export function valorCompra(pesoPeca: number, quantidade: number, precoKg: number, ipiPercentual: number) {
  const material = Math.round(pesoPeca * quantidade * precoKg * 100) / 100;
  const ipi = Math.round(material * (ipiPercentual / 100) * 100) / 100;
  return { material, ipi, total: Math.round((material + ipi) * 100) / 100 };
}
