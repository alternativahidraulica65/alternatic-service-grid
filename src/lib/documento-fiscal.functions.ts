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
    const { data: u, error } = await admin.storage.from("documentos-fiscais").createSignedUrl(data.path, 300);
    if (error || !u) throw new Error("Arquivo indisponível.");
    return { url: u.signedUrl };
  });
