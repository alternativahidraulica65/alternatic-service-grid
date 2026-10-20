import { describe, it, expect } from "vitest";
import { encontrarPreco, pesoTeorico, valorCompra, type PrecoReferencia } from "./materiais-calculo";

const r = (p: Partial<PrecoReferencia>): PrecoReferencia => ({
  id: Math.random().toString(), especificacao: "Aço SAE 1045", acabamento: "Cromado", formato: "redondo",
  diametro_mm: null, diametro_int_mm: null, faixa_min_mm: null, faixa_max_mm: null,
  densidade: 7.85, preco_kg: 0, ipi_percentual: 3.25, ativo: true, ...p,
});
const tabela = [
  r({ diametro_mm: 32, preco_kg: 22.75 }),
  r({ diametro_mm: 40, preco_kg: 21.5 }),
  r({ especificacao: "Ferro nodular FE-45012", acabamento: "Fundido", faixa_min_mm: 92.1, faixa_max_mm: 143.64, densidade: 7.2, preco_kg: 10.49 }),
];

describe("materiais", () => {
  it("peso barra Ø50 x 1000mm aço ≈ 15,41 kg", () => {
    expect(pesoTeorico("redondo", 50, 1000, 7.85)!).toBeCloseTo(15.413, 2);
  });
  it("tubo com interno >= externo é inválido", () => {
    expect(pesoTeorico("tubo", 80, 500, 7.85, 80)).toBeNull();
  });
  it("cromado Ø32 usa R$ 22,75 exato", () => {
    expect(encontrarPreco(tabela, "Aço SAE 1045", "Cromado", "redondo", 32)?.regra.preco_kg).toBe(22.75);
  });
  it("Ø38 sem registro usa base do material da bitola mais próxima (Ø40)", () => {
    const a = encontrarPreco(tabela, "Aço SAE 1045", "Cromado", "redondo", 38);
    expect(a?.tipo).toBe("base");
    expect(a?.regra.preco_kg).toBe(21.5);
  });
  it("nodular 5.1/4\" fora de qualquer faixa ainda usa R$ 10,49/kg", () => {
    expect(encontrarPreco(tabela, "Ferro nodular FE-45012", "Fundido", "redondo", 160)?.regra.preco_kg).toBe(10.49);
  });
  it("nodular Ø100 cai na faixa", () => {
    expect(encontrarPreco(tabela, "Ferro nodular FE-45012", "Fundido", "redondo", 100)?.tipo).toBe("faixa");
  });
  it("material sem nenhum cadastro retorna null", () => {
    expect(encontrarPreco(tabela, "Inexistente", null, "redondo", 50)).toBeNull();
  });
  it("IPI padrão 3,25% sobre R$ 100", () => {
    expect(valorCompra(1, 1, 100, 3.25)).toEqual({ material: 100, ipi: 3.25, total: 103.25 });
  });
});
