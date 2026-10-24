/**
 * Regras fiscais da emissão a partir da OS (puras, testáveis).
 * O ambiente vem SEMPRE de empresas_emissoras.ambiente_fiscal — trocar
 * para "producao" ali é a única mudança necessária para notas reais.
 */
import { enderecoDeRegistro, pendenciasCliente, pendenciasEmpresa } from "./fiscal";

export type TipoNota = "nfe" | "nfse";

export const NATUREZA_RETORNO = "Retorno de mercadoria ou bem recebido para conserto ou reparo";
export const CSOSN_RETORNO = "0400";
export const NCM_PADRAO_CILINDRO = "8412.29.00";

/** 5916 dentro do estado, 6916 para cliente de outra UF. */
export function cfopRetorno(ufEmpresa?: string | null, ufCliente?: string | null): string {
  const a = (ufEmpresa || "").trim().toUpperCase();
  const b = (ufCliente || "").trim().toUpperCase();
  return a && b && a !== b ? "6916" : "5916";
}

export type ItemFiscal = { descricao: string; quantidade: number; valor_unitario: number; tipo_item?: string | null };

export const totalItens = (itens: ItemFiscal[]) =>
  Math.round(itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0) * 100) / 100;

/** Serviços (NFS-e) = linhas "proposta" do orçamento; produtos vendidos ficam fora. */
export const itensServico = (itens: ItemFiscal[]) => itens.filter((i) => (i.tipo_item || "proposta") === "proposta");

export const chaveNfeValida = (chave?: string | null) => (chave || "").replace(/\D/g, "").length === 44;

export function pendenciasEmissao(args: {
  tipo: TipoNota;
  empresa: any;
  cliente: any;
  os: any;
  temCertificado: boolean;
  certificadoValidoAte?: string | null;
  valorServicos: number;
}): string[] {
  const { tipo, empresa, cliente, os } = args;
  const p: string[] = [];
  if (!empresa) return ["Selecione a empresa emissora"];
  pendenciasEmpresa({ ...empresa, ...enderecoDeRegistro(empresa) }).forEach((x) => p.push(`Empresa: ${x}`));
  if (!args.temCertificado) p.push("Empresa: certificado digital A1 não enviado");
  else if (args.certificadoValidoAte && new Date(args.certificadoValidoAte) < new Date()) p.push("Empresa: certificado digital vencido");
  if (!cliente) p.push("OS sem cliente cadastrado");
  else pendenciasCliente({ ...cliente, ...enderecoDeRegistro(cliente) }).forEach((x) => p.push(`Cliente: ${x}`));
  if (tipo === "nfse") {
    if (!empresa.nfse_codigo_tributacao) p.push("Empresa: código de tributação da NFS-e");
    if (args.valorServicos <= 0) p.push("Orçamento sem serviços com valor");
  } else {
    if (!os?.sem_remessa) {
      if (!(os?.nf_entrada_numero || "").trim()) p.push("NF de entrada: número");
      if (!chaveNfeValida(os?.nf_entrada_chave)) p.push("NF de entrada: chave de acesso (44 dígitos)");
    }
    if (!(Number(os?.nf_entrada_valor) > 0)) p.push("NF de entrada: valor do bem recebido");
  }
  return p;
}
