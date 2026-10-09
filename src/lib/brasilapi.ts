/**
 * Consulta pública de CNPJ pela BrasilAPI (gratuita, sem chave de acesso).
 * Docs: https://brasilapi.com.br/docs#tag/CNPJ
 */

export type DadosCnpj = {
  cnpj: string;
  cnpjFormatado: string;
  razaoSocial: string;
  nomeFantasia: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  situacao: string;
  atividade: string;
};

export const somenteDigitos = (valor: string) => (valor || "").replace(/\D+/g, "");

export const formatarCnpj = (valor: string) => {
  const d = somenteDigitos(valor).slice(0, 14);
  if (d.length !== 14) return valor;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export const cnpjValido = (valor: string) => {
  const d = somenteDigitos(valor);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false; // rejeita sequências repetidas (000..., 111...)
  const digito = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((acc, p, i) => acc + Number(base[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
};

const montarTelefone = (raw: any) => {
  const ddd = String(raw?.ddd_telefone_1 ?? "").trim();
  if (ddd) {
    const d = somenteDigitos(ddd);
    if (d.length >= 10) {
      const num = d.slice(2);
      return `(${d.slice(0, 2)}) ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
    }
    return ddd;
  }
  return "";
};

const montarEndereco = (raw: any) => {
  const partes = [
    [raw?.descricao_tipo_de_logradouro, raw?.logradouro].filter(Boolean).join(" ").trim(),
    raw?.numero ? String(raw.numero) : "",
    raw?.complemento || "",
    raw?.bairro || "",
    [raw?.municipio, raw?.uf].filter(Boolean).join(" - "),
    raw?.cep ? `CEP ${formatarCep(String(raw.cep))}` : "",
  ].filter((p) => p && String(p).trim().length > 0);
  return partes.join(", ");
};

export const formatarCep = (valor: string) => {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : valor;
};

const normalizar = (texto: unknown) => String(texto ?? "").trim();

export async function consultarCnpj(valor: string): Promise<DadosCnpj> {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 14) {
    throw new Error("Informe um CNPJ com 14 dígitos.");
  }

  // Fontes gratuitas com o mesmo formato de resposta; tenta em ordem (redundância).
  const fontes = [
    `https://brasilapi.com.br/api/v1/cnpj/${digitos}`,
    `https://minhareceita.org/${digitos}`,
  ];
  let raw: any = null;
  let todas404 = true;
  for (const url of fontes) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) {
        const json = await r.json();
        if (json?.razao_social || json?.cnpj) {
          raw = json;
          break;
        }
      }
      if (r.status !== 404) todas404 = false;
    } catch {
      todas404 = false;
    }
  }

  if (!raw) {
    throw new Error(
      todas404
        ? "CNPJ não encontrado na base da Receita Federal."
        : "Não foi possível consultar o CNPJ agora. Tente novamente em instantes.",
    );
  }
  const razaoSocial = normalizar(raw?.razao_social);
  const nomeFantasia = normalizar(raw?.nome_fantasia);

  return {
    cnpj: digitos,
    cnpjFormatado: formatarCnpj(digitos),
    razaoSocial,
    nomeFantasia,
    nome: nomeFantasia || razaoSocial,
    email: normalizar(raw?.email).toLowerCase(),
    telefone: montarTelefone(raw),
    endereco: montarEndereco(raw),
    cidade: normalizar(raw?.municipio),
    uf: normalizar(raw?.uf),
    cep: raw?.cep ? formatarCep(String(raw.cep)) : "",
    situacao: normalizar(raw?.descricao_situacao_cadastral),
    atividade: normalizar(raw?.cnae_fiscal_descricao),
  };
}
