import { supabase } from "@/integrations/supabase/client";

/**
 * Salva o vendedor responsável de um cliente.
 *
 * Alguns bancos ainda não possuem a coluna `venda_propria`. Nesse caso o
 * PostgREST responde 400 (42703 / PGRST204) e refazemos a gravação apenas com
 * `vendedor_id` — "Próprio" continua valendo como "sem comissão a vendedor".
 */
export function patchVendedor(valorSelecionado: string) {
  if (valorSelecionado === "proprio") return { vendedor_id: null, venda_propria: true };
  if (valorSelecionado === "nenhum") return { vendedor_id: null, venda_propria: false };
  return { vendedor_id: valorSelecionado, venda_propria: false };
}

function colunaAusente(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    msg.includes("venda_propria")
  );
}

export async function salvarVendedorCliente(
  clienteId: string,
  valorSelecionado: string,
): Promise<{ error: { message: string } | null }> {
  const patch = patchVendedor(valorSelecionado);

  const primeira = await (supabase as any)
    .from("clientes")
    .update(patch)
    .eq("id", clienteId);

  if (!primeira.error) return { error: null };
  if (!colunaAusente(primeira.error)) return { error: primeira.error };

  const segunda = await (supabase as any)
    .from("clientes")
    .update({ vendedor_id: patch.vendedor_id })
    .eq("id", clienteId);

  return { error: segunda.error ?? null };
}
