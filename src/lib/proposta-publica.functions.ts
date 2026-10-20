import { obterChaveAdmin } from "./admin-key";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUPABASE_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";

async function headers() {
  const key = await obterChaveAdmin();
  return { apikey: key, "Content-Type": "application/json" };
}

async function rest(caminho: string) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, { headers: await headers() });
  if (!resp.ok) throw new Error(await resp.text());
  return (await resp.json()) as any[];
}

async function urlAssinada(bucket: string, caminho: string, segundos = 60 * 60 * 24 * 7) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${caminho}`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ expiresIn: segundos }),
  });
  if (!resp.ok) return null;
  const json = (await resp.json()) as any;
  return json?.signedURL ? `${SUPABASE_URL}/storage/v1${json.signedURL}` : null;
}

function caminhoDaUrl(url: string | null | undefined, bucket: string) {
  if (!url) return null;
  const marcador = `/${bucket}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  const trecho = url.slice(idx + marcador.length);
  return decodeURIComponent(trecho.split("?")[0] ?? trecho);
}

/** Carrega a proposta a partir do link público (token), sem exigir login. */
export const carregarPropostaPublica = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(10) }).parse(data))
  .handler(async ({ data }) => {
    const oss = await rest(
      `ordens_servico?orcamento_token=eq.${encodeURIComponent(data.token)}&select=*,clientes(*),tipos_equipamento(nome)&limit=1`,
    );
    const os = oss[0];
    if (!os) return null;

    const [livres, dadosArr, empresas] = await Promise.all([
      rest(`orcamento_itens?os_id=eq.${os.id}&select=id,descricao,quantidade,valor_unitario,ordem,tipo_item&order=ordem`),
      rest(`orcamento_dados?os_id=eq.${os.id}&select=*&limit=1`),
      rest(`empresas_emissoras?select=*&order=criado_em`),
    ]);

    const registro = dadosArr[0] || null;
    const empresaCadastro =
      empresas.find((e: any) => e.id === os.empresa_id) || empresas.find((e: any) => e.ativo) || empresas[0] || null;

    let vendedorCadastro: any = null;
    if (os?.clientes?.vendedor_id) {
      const v = await rest(`vendedores?id=eq.${os.clientes.vendedor_id}&select=*&limit=1`);
      vendedorCadastro = v[0] || null;
    }

    const empresa = {
      nome: empresaCadastro?.nome || "",
      razao_social: empresaCadastro?.razao_social || empresaCadastro?.nome || "",
      cnpj: empresaCadastro?.cnpj || "",
      endereco: empresaCadastro?.endereco || "",
      telefone: empresaCadastro?.telefone || "",
      email: empresaCadastro?.email || "",
      site: empresaCadastro?.site || "",
      logo_url: empresaCadastro?.logo_url || "",
      ...(registro?.empresa_snapshot || {}),
    };
    const vendedor = {
      nome: vendedorCadastro?.apelido || vendedorCadastro?.nome || "",
      telefone: vendedorCadastro?.telefone || "",
      email: vendedorCadastro?.email || "",
      ...(registro?.vendedor_snapshot || {}),
    };

    const selecionadas: string[] = registro?.fotos_selecionadas || [];
    let fotos: any[] = [];
    if (selecionadas.length > 0) {
      const lista = await rest(
        `fotos_anexos?os_id=eq.${os.id}&select=id,foto_url,storage_path,bucket,legenda&order=criado_em`,
      );
      fotos = await Promise.all(
        lista
          .filter((f: any) => selecionadas.includes(f.id))
          .map(async (f: any) => {
            const bucket = f.bucket || "os-assets";
            const caminho = f.storage_path || caminhoDaUrl(f.foto_url, bucket);
            const url = caminho ? await urlAssinada(bucket, caminho) : f.foto_url;
            return { ...f, url: url || f.foto_url };
          }),
      );
    }

    const logoPath = empresa.logo_url;
    const logo = logoPath
      ? logoPath.startsWith("http")
        ? logoPath
        : await urlAssinada("empresa-assets", logoPath)
      : null;

    // Envia ao cliente apenas os campos da proposta: nada de custos, margens ou notas internas.
    const c = os.clientes || {};
    const osPublica = {
      id: os.id,
      numero_os: os.numero_os,
      descricao: os.descricao,
      cliente: os.cliente,
      laudo_diagnostico: os.laudo_diagnostico,
      laudo_servicos_necessarios: os.laudo_servicos_necessarios,
      valor_final: os.valor_final,
      tipos_equipamento: os.tipos_equipamento,
      clientes: {
        id: c.id, nome: c.nome, razao_social: c.razao_social, cnpj: c.cnpj,
        email: c.email, telefone: c.telefone, endereco: c.endereco,
      },
    };
    const fotosPublicas = fotos.map((f: any) => ({ id: f.id, url: f.url, legenda: f.legenda }));

    return {
      os: osPublica,
      livres,
      empresa,
      vendedor,
      condicoes: registro?.condicoes || {},
      logo,
      fotos: fotosPublicas,
    };
  });
