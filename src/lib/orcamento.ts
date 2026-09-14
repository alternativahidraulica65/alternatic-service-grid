import { supabase } from "@/integrations/supabase/client";

export const brl = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (v: unknown) => Number(v ?? 0) || 0;

export type EmpresaSnapshot = {
  nome: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  site: string;
  logo_url: string;
};

export type VendedorSnapshot = {
  nome: string;
  telefone: string;
  email: string;
};

export type CondicoesProposta = {
  prazoEntrega: number;
  garantia: number;
  validade: number;
  pagamento: string;
  observacoes: string;
  /** Comissão ajustada manualmente neste orçamento (null = usa a regra do vendedor). */
  comissaoManual?: number | null;
  /** Mostrar a comissão no PDF da proposta. Padrão: oculto. */
  comissaoVisivel?: boolean;
};

export const EMPRESA_VAZIA: EmpresaSnapshot = {
  nome: "",
  razao_social: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  site: "",
  logo_url: "",
};

export const VENDEDOR_VAZIO: VendedorSnapshot = { nome: "", telefone: "", email: "" };

export function empresaDoCadastro(empresa: any): EmpresaSnapshot {
  return {
    nome: empresa?.nome || "",
    razao_social: empresa?.razao_social || empresa?.nome || "",
    cnpj: empresa?.cnpj || "",
    endereco: empresa?.endereco || "",
    telefone: empresa?.telefone || "",
    email: empresa?.email || "",
    site: empresa?.site || "",
    logo_url: empresa?.logo_url || "",
  };
}

export function vendedorDoCadastro(vendedor: any): VendedorSnapshot {
  return {
    nome: vendedor?.apelido || vendedor?.nome || "",
    telefone: vendedor?.telefone || "",
    email: vendedor?.email || "",
  };
}

/** Fotos da OS (checklist, peças e anexos) com URL assinada para exibição. */
export async function carregarFotosOs(osId: string) {
  const { data, error } = await supabase
    .from("fotos_anexos")
    .select("id, foto_url, storage_path, bucket, legenda, categoria, tipo, criado_em")
    .eq("os_id", osId)
    .order("criado_em");
  if (error) throw error;

  const lista = (data || []) as any[];
  return Promise.all(
    lista.map(async (f) => {
      const bucket = f.bucket || "os-assets";
      let url: string | null = f.foto_url || null;
      const caminho = f.storage_path || extrairCaminho(f.foto_url, bucket);
      if (caminho) {
        const assinada = await supabase.storage.from(bucket).createSignedUrl(caminho, 60 * 60);
        if (assinada.data?.signedUrl) url = assinada.data.signedUrl;
      }
      return { ...f, url };
    }),
  );
}

function extrairCaminho(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marcador = `/${bucket}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  const trecho = url.slice(idx + marcador.length);
  return decodeURIComponent(trecho.split("?")[0] ?? trecho);
}

/** URL assinada da logo guardada no bucket privado empresa-assets. */
export async function urlLogo(logoPath?: string | null): Promise<string | null> {
  if (!logoPath) return null;
  if (logoPath.startsWith("http")) return logoPath;
  const { data } = await supabase.storage.from("empresa-assets").createSignedUrl(logoPath, 60 * 60);
  return data?.signedUrl ?? null;
}

export function dataBr(valor?: string | Date | null) {
  const d = valor ? new Date(valor) : new Date();
  return d.toLocaleDateString("pt-BR");
}

export function somarDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + (Number(dias) || 0));
  return d.toLocaleDateString("pt-BR");
}
