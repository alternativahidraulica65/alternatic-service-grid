import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna o e-mail do usuário autenticado para gravar nos logs (historico_status_os).
 */
export async function getExecutorEmail(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}
