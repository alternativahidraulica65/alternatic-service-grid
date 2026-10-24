import { describe, it, expect } from "vitest";
import { cfopRetorno, itensServico, totalItens, pendenciasEmissao } from "./emissao-fiscal";

const empresa = {
  cnpj: "32.504.513/0001-26", inscricao_estadual: "535727719111", inscricao_municipal: "649734",
  regime_tributario: "simples_nacional", cep: "13402-050", logradouro: "RUA GALIA", numero: "183",
  bairro: "JARDIM ITAPUA", cidade: "Piracicaba", uf: "SP", codigo_ibge: "3538709", nfse_codigo_tributacao: "14.01.01",
};
const cliente = { ...empresa, indicador_ie: "1" };

describe("emissão fiscal", () => {
  it("CFOP 5916 dentro de SP", () => expect(cfopRetorno("SP", "SP")).toBe("5916"));
  it("CFOP 6916 para outra UF", () => expect(cfopRetorno("SP", "MG")).toBe("6916"));
  it("NFS-e soma só serviços", () => {
    const itens = [
      { descricao: "Usinagem", quantidade: 2, valor_unitario: 100, tipo_item: "proposta" },
      { descricao: "Vedação", quantidade: 1, valor_unitario: 50, tipo_item: "produto" },
    ];
    expect(totalItens(itensServico(itens))).toBe(200);
  });
  it("NF-e de retorno exige chave de entrada com 44 dígitos", () => {
    const p = pendenciasEmissao({ tipo: "nfe", empresa, cliente, os: { nf_entrada_numero: "10", nf_entrada_chave: "123", nf_entrada_valor: 100 }, temCertificado: true, valorServicos: 0 });
    expect(p).toContain("NF de entrada: chave de acesso (44 dígitos)");
  });
  it("NF-e sem remessa dispensa número e chave, mas exige valor", () => {
    const p = pendenciasEmissao({ tipo: "nfe", empresa, cliente, os: { sem_remessa: true, nf_entrada_valor: 0 }, temCertificado: true, valorServicos: 0 });
    expect(p).not.toContain("NF de entrada: número");
    expect(p).not.toContain("NF de entrada: chave de acesso (44 dígitos)");
    expect(p).toContain("NF de entrada: valor do bem recebido");
  });
  it("sem certificado bloqueia", () => {
    const p = pendenciasEmissao({ tipo: "nfse", empresa, cliente, os: {}, temCertificado: false, valorServicos: 100 });
    expect(p).toContain("Empresa: certificado digital A1 não enviado");
  });
  it("cadastro completo não tem pendências na NFS-e", () => {
    expect(pendenciasEmissao({ tipo: "nfse", empresa, cliente, os: {}, temCertificado: true, valorServicos: 100 })).toEqual([]);
  });
});
