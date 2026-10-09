import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const removerChecklist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ osId: z.string().min(1), accessToken: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["EXTERNAL_SUPABASE_SECRET_KEY"];
    if (!key) throw new Error("Serviço indisponível. Tente novamente mais tarde.");
    const client = createClient("https://mpwnrcxyyeqftrejwmmx.supabase.co", key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });
    const { data: auth, error: authError } = await client.auth.getUser(data.accessToken);
    if (authError || !auth.user) throw new Error("Sessão inválida. Entre novamente.");
    const { data: roles, error: roleError } = await client.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (roleError) throw roleError;
    if (!roles?.some((r) => ["gestor", "diretor", "administrativo_financeiro", "financeiro"].includes(r.role))) {
      throw new Error("Somente Gestor, Diretor ou Financeiro podem remover o checklist.");
    }
    const { data: os, error: osError } = await client.from("ordens_servico").select("status").eq("id", data.osId).single();
    if (osError) throw osError;
    const { error } = await client.from("os_checklist_tecnico").delete().eq("os_id", data.osId);
    if (error) throw error;
    const { error: logError } = await client.from("historico_status_os").insert({
      os_id: data.osId, status_anterior: os.status, status_novo: os.status,
      observacao: "Checklist removido", executor_id: auth.user.id, executor_email: auth.user.email,
    });
    if (logError) throw logError;
    return { ok: true };
  });