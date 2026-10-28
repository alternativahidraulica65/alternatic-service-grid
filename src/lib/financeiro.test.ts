import { describe, it, expect } from "vitest";
import { vencimentosDaNota, parsePrazos, tetoDoRegime } from "./financeiro";

describe("regras financeiras", () => {
  it("NF emitida em 28/10/2026 com 30 DDL vence em 27/11/2026", () => {
    expect(vencimentosDaNota("2026-10-28", "30 DDL após aprovação")).toEqual(["2026-11-27"]);
  });
  it("30/60 DDL gera duas parcelas", () => {
    expect(vencimentosDaNota("2026-10-28", "30/60 DDL")).toEqual(["2026-11-27", "2026-12-27"]);
  });
  it("à vista vence no dia da emissão", () => {
    expect(parsePrazos("À vista / PIX")).toEqual([0]);
  });
  it("teto ME do Simples é R$ 360 mil", () => {
    expect(tetoDoRegime("simples_nacional").teto).toBe(360000);
  });
});
