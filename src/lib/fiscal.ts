/**
 * Campos fiscais compartilhados entre empresas emissoras e clientes.
 * Endereço estruturado + inscrições são exigidos pelo XML de NF-e / NFS-e.
 */
export type EnderecoFiscal = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  codigo_ibge: string;
};

export const ENDERECO_VAZIO: EnderecoFiscal = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  codigo_ibge: "",
};

export const enderecoDeRegistro = (r: any): EnderecoFiscal => ({
  cep: r?.cep || "",
  logradouro: r?.logradouro || "",
  numero: r?.numero || "",
  complemento: r?.complemento || "",
  bairro: r?.bairro || "",
  cidade: r?.cidade || "",
  uf: r?.uf || "",
  codigo_ibge: r?.codigo_ibge || "",
});

/** Monta o texto legado `endereco` a partir do endereço estruturado. */
export const enderecoTexto = (e: EnderecoFiscal) =>
  [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.complemento,
    e.bairro,
    [e.cidade, e.uf].filter(Boolean).join(" - "),
    e.cep ? `CEP ${e.cep}` : "",
  ]
    .filter((p) => p && p.trim())
    .join(", ");

export const limparEndereco = (e: EnderecoFiscal) => ({
  cep: e.cep.trim() || null,
  logradouro: e.logradouro.trim() || null,
  numero: e.numero.trim() || null,
  complemento: e.complemento.trim() || null,
  bairro: e.bairro.trim() || null,
  cidade: e.cidade.trim() || null,
  uf: e.uf.trim().toUpperCase() || null,
  codigo_ibge: e.codigo_ibge.replace(/\D/g, "") || null,
});

export const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional (ME/EPP)" },
  { value: "simples_excesso", label: "Simples Nacional — excesso de sublimite" },
  { value: "normal", label: "Regime Normal (Presumido/Real)" },
];

export const INDICADORES_IE = [
  { value: "1", label: "Contribuinte de ICMS" },
  { value: "2", label: "Contribuinte isento" },
  { value: "9", label: "Não contribuinte" },
];

/** Lista o que falta para o cadastro estar apto a emitir nota. */
export function pendenciasEndereco(e: EnderecoFiscal): string[] {
  const p: string[] = [];
  if (e.cep.replace(/\D/g, "").length !== 8) p.push("CEP");
  if (!e.logradouro.trim()) p.push("Logradouro");
  if (!e.numero.trim()) p.push("Número");
  if (!e.bairro.trim()) p.push("Bairro");
  if (!e.cidade.trim()) p.push("Cidade");
  if (e.uf.trim().length !== 2) p.push("UF");
  if (e.codigo_ibge.replace(/\D/g, "").length !== 7) p.push("Código IBGE");
  return p;
}

export function pendenciasCliente(c: {
  cnpj?: string | null;
  indicador_ie?: string | null;
  inscricao_estadual?: string | null;
} & EnderecoFiscal): string[] {
  const p: string[] = [];
  const doc = (c.cnpj || "").replace(/\D/g, "");
  if (doc.length !== 14 && doc.length !== 11) p.push("CNPJ/CPF");
  if (c.indicador_ie === "1" && !(c.inscricao_estadual || "").trim()) p.push("Inscrição estadual");
  return [...p, ...pendenciasEndereco(c)];
}

export function pendenciasEmpresa(e: {
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  regime_tributario?: string | null;
} & EnderecoFiscal): string[] {
  const p: string[] = [];
  if ((e.cnpj || "").replace(/\D/g, "").length !== 14) p.push("CNPJ");
  if (!(e.inscricao_estadual || "").trim()) p.push("Inscrição estadual");
  if (!(e.inscricao_municipal || "").trim()) p.push("Inscrição municipal");
  if (!e.regime_tributario) p.push("Regime tributário");
  return [...p, ...pendenciasEndereco(e)];
}
