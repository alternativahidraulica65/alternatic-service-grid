import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { obterChaveAdmin } from "./admin-key";

const OFFICIAL_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";

/** Gera link temporário para XML/PDF de nota fiscal, só para Diretor/Financeiro. */
export const obterUrlDocumentoFiscal = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ accessToken: z.string().min(10), path: z.string().min(3).max(300) }).parse(i))
  .handler(async ({ data }) => {
    if (data.path.includes("..")) throw new Error("Caminho inválido.");
    const admin = createClient(OFFICIAL_URL, await obterChaveAdmin(), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await admin.auth.getUser(data.accessToken);
    if (!auth?.user) throw new Error("Sessão inválida. Entre novamente.");
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (!roles?.some((r) => ["diretor", "financeiro", "administrativo_financeiro"].includes(r.role as string)))
      throw new Error("Somente Diretor ou Financeiro podem baixar documentos fiscais.");
    const { data: nota } = await admin.from("notas_fiscais").select("id")
      .or(`xml_path.eq.${data.path},pdf_path.eq.${data.path}`).limit(1).maybeSingle();
    if (!nota) throw new Error("Documento não encontrado.");
    const { data: blob, error } = await admin.storage.from("documentos-fiscais").download(data.path);
    if (error || !blob) throw new Error("Arquivo indisponível.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const mime = data.path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/xml";
    return { base64: btoa(bin), mime, nome: data.path.split("/").pop() || "documento" };
  });
