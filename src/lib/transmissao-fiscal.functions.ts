import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { obterChaveAdmin } from "./admin-key";

const OFFICIAL_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";
const BUCKET = "documentos-fiscais";

async function chaveMestre(): Promise<CryptoKey> {
  const segredo = process.env["FISCAL_CERT_MASTER_KEY"];
  if (!segredo) throw new Error("Cofre fiscal não configurado.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(segredo));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
}
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function decifrar(v: string): Promise<string> {
  const [, iv, ct] = v.split(":");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(iv!) }, await chaveMestre(), deB64(ct!));
  return new TextDecoder().decode(pt);
}
const so = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Assina e transmite uma nota preparada (rascunho/rejeitada) via transmissor da VPS. Serve para qualquer OS. */
export const transmitirNota = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ accessToken: z.string().min(10), notaId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const url = process.env["FISCAL_BRIDGE_URL"]?.replace(/\/+$/, "");
    const apiKey = process.env["FISCAL_BRIDGE_KEY"];
    if (!url || !apiKey) throw new Error("Transmissor fiscal não configurado.");

    const admin = createClient(OFFICIAL_URL, await obterChaveAdmin(), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await admin.auth.getUser(data.accessToken);
    if (!auth?.user) throw new Error("Sessão inválida. Entre novamente.");
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (!roles?.some((r) => ["diretor", "financeiro", "administrativo_financeiro"].includes(r.role as string)))
      throw new Error("Somente Diretor ou Financeiro podem transmitir notas.");

    const { data: nota } = await admin.from("notas_fiscais").select("*").eq("id", data.notaId).single();
    if (!nota) throw new Error("Nota não encontrada.");
    if (!["rascunho", "rejeitada"].includes(nota.status)) throw new Error("Esta nota já foi transmitida.");

    const [{ data: emp }, { data: cofre }, { data: cli }, { data: os }] = await Promise.all([
      admin.from("empresas_emissoras").select("*").eq("id", nota.empresa_id).single(),
      admin.from("certificados_fiscais_cofre").select("pfx_cifrado, senha_cifrada").eq("empresa_id", nota.empresa_id).maybeSingle(),
      admin.from("clientes").select("*").eq("id", nota.cliente_id).maybeSingle(),
      admin.from("ordens_servico").select("numero_os").eq("id", nota.os_id).maybeSingle(),
    ]);
    if (!emp) throw new Error("Empresa emissora não encontrada.");
    if (!cofre) throw new Error("Certificado A1 não cadastrado para esta empresa.");
    if (!cli) throw new Error("Cliente da nota não encontrado.");
    // Ambiente sempre vem da nota (gravado na reserva) — teste nunca vira produção.
    const ambiente = nota.ambiente === "producao" ? "producao" : "homologacao";

    await admin.from("notas_fiscais").update({ status: "processando", updated_at: new Date().toISOString() }).eq("id", nota.id);

    const emitente = {
      cnpj: emp.cnpj, razao_social: emp.razao_social || emp.nome, nome_fantasia: emp.nome,
      inscricao_estadual: emp.inscricao_estadual, inscricao_municipal: emp.inscricao_municipal,
      crt: /simples/i.test(emp.regime_tributario || "") ? "1" : "3", op_simples: /simples/i.test(emp.regime_tributario || "") ? "3" : "1",
      logradouro: emp.logradouro, numero: emp.numero, complemento: emp.complemento, bairro: emp.bairro,
      cidade: emp.cidade, uf: emp.uf, cep: emp.cep, codigo_ibge: emp.codigo_ibge, telefone: emp.telefone,
    };
    const endCli = {
      logradouro: cli.logradouro, numero: cli.numero, complemento: cli.complemento, bairro: cli.bairro,
      cidade: cli.cidade, uf: cli.uf, cep: cli.cep, codigo_ibge: cli.codigo_ibge, email: cli.email_fiscal || cli.email,
    };
    const itens = (nota.itens || []) as any[];
    const info = [nota.observacoes, `Referente à OS ${os?.numero_os || ""}`].filter(Boolean).join(" · ");

    const body = nota.tipo === "nfe"
      ? {
          ambiente, nota: {
            serie: nota.serie, numero: nota.numero, natureza_operacao: nota.natureza_operacao, emitente,
            destinatario: { ...endCli, nome: cli.razao_social || cli.nome, cpf_cnpj: cli.cnpj, inscricao_estadual: cli.inscricao_estadual, indicador_ie: cli.indicador_ie },
            itens, nfe_referenciadas: nota.nf_entrada_referencia ? [nota.nf_entrada_referencia] : [], informacoes_complementares: info,
          },
        }
      : {
          ambiente, nota: {
            serie: nota.serie, numero: nota.numero, emitente,
            tomador: { ...endCli, nome: cli.razao_social || cli.nome, cpf_cnpj: cli.cnpj },
            codigo_tributacao: emp.nfse_codigo_tributacao, codigo_nbs: emp.nfse_codigo_nbs,
            aliquota_simples: Number((emp as any).aliquota_simples ?? 6), aliquota_iss: Number((emp as any).aliquota_iss ?? 5),
            descricao: (itens.map((i) => i.descricao).join("; ") + (info ? ` · ${info}` : "")).slice(0, 1900),
            valor: Number(nota.valor_total),
          },
        };

    let r: any;
    try {
      const pfx = await decifrar(cofre.pfx_cifrado);
      const senha = await decifrar(cofre.senha_cifrada);
      const resp = await fetch(`${url}/${nota.tipo === "nfe" ? "nfe" : "nfse"}/emitir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ ...body, certificado: { pfx_base64: pfx, senha } }),
      });
      r = await resp.json().catch(() => ({ erro: `Resposta inválida do transmissor (HTTP ${resp.status}).` }));
    } catch (e) {
      console.error("transmitirNota", e);
      r = { erro: "Não foi possível conectar ao transmissor fiscal." };
    }

    if (r.erro || !r.autorizada) {
      const motivo = r.erro || r.xMotivo || (r.erros ? JSON.stringify(r.erros).slice(0, 500) : "Rejeitada sem motivo informado.");
      await admin.from("notas_fiscais").update({
        status: "rejeitada", codigo_status: r.cStat || (r.http_status ? String(r.http_status) : null),
        motivo_status: motivo, updated_at: new Date().toISOString(),
      }).eq("id", nota.id);
      return { autorizada: false, motivo };
    }

    const pasta = `${nota.empresa_id}/${ambiente}/${nota.tipo}-${nota.serie}-${nota.numero}`;
    let xml_path: string | null = null, pdf_path: string | null = null;
    if (r.xml_autorizado) {
      const { error } = await admin.storage.from(BUCKET).upload(`${pasta}.xml`, new Blob([r.xml_autorizado], { type: "application/xml" }), { upsert: true });
      if (!error) xml_path = `${pasta}.xml`;
    }
    if (r.danfe_pdf_base64) {
      const { error } = await admin.storage.from(BUCKET).upload(`${pasta}.pdf`, new Blob([deB64(r.danfe_pdf_base64)], { type: "application/pdf" }), { upsert: true });
      if (!error) pdf_path = `${pasta}.pdf`;
    }
    await admin.from("notas_fiscais").update({
      status: "autorizada", chave_acesso: so(r.chave) || r.chave, protocolo: r.protocolo || null,
      codigo_status: r.cStat || "100", motivo_status: r.xMotivo || "Autorizada",
      xml_path, pdf_path, emitida_em: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", nota.id);
    if (nota.tipo === "nfse" && xml_path && !pdf_path) {
      try {
        const { gerarPdfDeNfse } = await import("./danfse-storage");
        await gerarPdfDeNfse(admin, { ...nota, xml_path });
      } catch (e) { console.error("DANFSe", e); }
    }
    return { autorizada: true, motivo: r.xMotivo || "Autorizada" };
  });

/** Cancela uma NFS-e autorizada (evento 101101) via transmissor. Só Diretor/Financeiro. */
export const cancelarNota = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    accessToken: z.string().min(10), notaId: z.string().uuid(), motivo: z.string().trim().min(15).max(255),
  }).parse(i))
  .handler(async ({ data }) => {
    const url = process.env["FISCAL_BRIDGE_URL"]?.replace(/\/+$/, "");
    const apiKey = process.env["FISCAL_BRIDGE_KEY"];
    if (!url || !apiKey) throw new Error("Transmissor fiscal não configurado.");
    const admin = createClient(OFFICIAL_URL, await obterChaveAdmin(), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await admin.auth.getUser(data.accessToken);
    if (!auth?.user) throw new Error("Sessão inválida. Entre novamente.");
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (!roles?.some((r) => ["diretor", "financeiro", "administrativo_financeiro"].includes(r.role as string)))
      throw new Error("Somente Diretor ou Financeiro podem cancelar notas.");

    const { data: nota } = await admin.from("notas_fiscais").select("*").eq("id", data.notaId).single();
    if (!nota) throw new Error("Nota não encontrada.");
    if (nota.tipo !== "nfse") throw new Error("Cancelamento disponível apenas para NFS-e.");
    if (nota.status !== "autorizada" || !nota.chave_acesso) throw new Error("Só notas autorizadas podem ser canceladas.");
    const [{ data: emp }, { data: cofre }] = await Promise.all([
      admin.from("empresas_emissoras").select("cnpj").eq("id", nota.empresa_id).single(),
      admin.from("certificados_fiscais_cofre").select("pfx_cifrado, senha_cifrada").eq("empresa_id", nota.empresa_id).maybeSingle(),
    ]);
    if (!emp || !cofre) throw new Error("Empresa ou certificado não encontrado.");
    const ambiente = nota.ambiente === "producao" ? "producao" : "homologacao";

    let r: any;
    try {
      const resp = await fetch(`${url}/nfse/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          ambiente, cancelamento: { chave: nota.chave_acesso, cnpj: emp.cnpj, motivo: data.motivo, codigo_motivo: "9" },
          certificado: { pfx_base64: await decifrar(cofre.pfx_cifrado), senha: await decifrar(cofre.senha_cifrada) },
        }),
      });
      r = await resp.json().catch(() => ({ erro: `Resposta inválida do transmissor (HTTP ${resp.status}).` }));
    } catch (e) {
      console.error("cancelarNota", e);
      r = { erro: "Não foi possível conectar ao transmissor fiscal." };
    }
    if (r.erro || !r.cancelada) {
      const motivo = r.erro || (r.erros ? JSON.stringify(r.erros).slice(0, 500) : "Recusado sem motivo informado.");
      return { cancelada: false, motivo };
    }
    await admin.from("notas_fiscais").update({
      status: "cancelada", motivo_status: `Cancelada: ${data.motivo}`, updated_at: new Date().toISOString(),
    }).eq("id", nota.id);
    return { cancelada: true, motivo: "Cancelada" };
  });
