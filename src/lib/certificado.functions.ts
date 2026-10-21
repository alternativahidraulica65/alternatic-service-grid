import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { obterChaveAdmin } from "./admin-key";

const OFFICIAL_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";

/** Deriva a chave AES-256 a partir do segredo mestre do servidor (nunca vai ao navegador nem ao banco). */
async function chaveMestre(): Promise<CryptoKey> {
  const segredo = process.env["FISCAL_CERT_MASTER_KEY"];
  if (!segredo) throw new Error("Cofre fiscal não configurado.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(segredo));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const b64 = (u: Uint8Array) => btoa(Array.from(u, (c) => String.fromCharCode(c)).join(""));

async function cifrar(texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chaveMestre(), new TextEncoder().encode(texto)));
  return `v1:${b64(iv)}:${b64(ct)}`;
}

async function verificarDirFin(accessToken: string) {
  const key = await obterChaveAdmin();
  const admin = createClient(OFFICIAL_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error } = await admin.auth.getUser(accessToken);
  if (error || !auth.user) throw new Error("Sessão inválida. Entre novamente.");
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id);
  if (!roles?.some((r) => ["diretor", "financeiro", "administrativo_financeiro"].includes(r.role as string))) {
    throw new Error("Somente Diretor ou Financeiro podem gerenciar o certificado.");
  }
  return { admin, userId: auth.user.id };
}

export const salvarCertificado = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      accessToken: z.string().min(10),
      empresaId: z.string().uuid(),
      pfxBase64: z.string().min(100).max(200_000),
      senha: z.string().min(1).max(200),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { admin, userId } = await verificarDirFin(data.accessToken);
    const forge = (await import("node-forge")).default;

    // Valida a senha abrindo o certificado — se a senha estiver errada, nada é gravado.
    let cert: import("node-forge").pki.Certificate;
    try {
      const der = forge.util.decode64(data.pfxBase64);
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), data.senha);
      const certOid = forge.pki.oids["certBag"]!;
      const keyOid = forge.pki.oids["pkcs8ShroudedKeyBag"]!;
      const bags = p12.getBags({ bagType: certOid })[certOid] ?? [];
      const keyBags = p12.getBags({ bagType: keyOid })[keyOid] ?? [];
      if (!bags[0]?.cert || !keyBags[0]?.key) throw new Error();
      const certs = bags.map((b) => b.cert!).filter(Boolean);
      cert = certs.find((c) => !c.extensions.some((e: { name?: string; cA?: boolean }) => e.name === "basicConstraints" && e.cA)) ?? certs[0]!;
    } catch {
      throw new Error("Certificado inválido ou senha incorreta.");
    }
    if (cert.validity.notAfter < new Date()) throw new Error("Este certificado está vencido.");

    const cn = (cert.subject.getField("CN")?.value as string) ?? "";
    const cnpj = cn.match(/(\d{14})/)?.[1] ?? null;
    const { data: emp } = await admin.from("empresas_emissoras").select("cnpj").eq("id", data.empresaId).single();
    const cnpjEmpresa = (emp?.cnpj ?? "").replace(/\D/g, "");
    if (cnpj && cnpjEmpresa && cnpj !== cnpjEmpresa) {
      throw new Error("O CNPJ do certificado não corresponde ao da empresa selecionada.");
    }
    const md = forge.md.sha256.create();
    md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());

    const { error: e1 } = await admin.from("certificados_fiscais_cofre").upsert({
      empresa_id: data.empresaId,
      pfx_cifrado: await cifrar(data.pfxBase64),
      senha_cifrada: await cifrar(data.senha),
      updated_at: new Date().toISOString(),
    });
    if (e1) throw new Error("Falha ao gravar no cofre.");
    const meta = {
      empresa_id: data.empresaId,
      titular: cn.split(":")[0] || cn,
      cnpj_certificado: cnpj,
      emissor: (cert.issuer.getField("CN")?.value as string) ?? null,
      valido_de: cert.validity.notBefore.toISOString(),
      valido_ate: cert.validity.notAfter.toISOString(),
      impressao_digital: md.digest().toHex().slice(0, 32).toUpperCase(),
      enviado_por: userId,
      enviado_em: new Date().toISOString(),
    };
    const { error: e2 } = await admin.from("certificados_fiscais").upsert(meta);
    if (e2) throw new Error("Falha ao gravar dados do certificado.");
    return { titular: meta.titular, valido_ate: meta.valido_ate };
  });

export const removerCertificado = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ accessToken: z.string().min(10), empresaId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { admin } = await verificarDirFin(data.accessToken);
    await admin.from("certificados_fiscais_cofre").delete().eq("empresa_id", data.empresaId);
    await admin.from("certificados_fiscais").delete().eq("empresa_id", data.empresaId);
    return { ok: true };
  });
