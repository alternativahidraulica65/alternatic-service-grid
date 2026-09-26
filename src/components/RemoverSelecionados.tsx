import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  tabela: string;
  ids: string[];
  rotulo: string; // ex.: "cliente(s)"
  onRemovidos: () => void;
};

/** Botão de exclusão em massa dos registros selecionados, com confirmação. */
export function RemoverSelecionados({ tabela, ids, rotulo, onRemovidos }: Props) {
  const [aberto, setAberto] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const queryClient = useQueryClient();
  if (ids.length === 0) return null;

  const remover = async () => {
    setRemovendo(true);
    let ok = 0;
    const bloqueados: string[] = [];
    let outroErro: string | null = null;
    for (const id of ids) {
      const { error, count } = await (supabase as any)
        .from(tabela).delete({ count: "exact" }).eq("id", id);
      if (!error && count !== 0) { ok++; continue; }
      if (error?.code === "23503") bloqueados.push(id);
      else outroErro = error?.message ?? "Sem permissão para remover.";
    }
    setRemovendo(false);
    setAberto(false);
    await queryClient.invalidateQueries();
    onRemovidos();
    if (ok) toast.success(`${ok} ${rotulo} removido(s) do banco.`);
    if (bloqueados.length)
      toast.error(`${bloqueados.length} não removido(s): possuem registros vinculados (OS, custos, etc.). Inative-os em vez de excluir.`);
    if (outroErro) toast.error(`Falha ao remover: ${outroErro}`);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="h-10 font-bold uppercase text-[10px] tracking-widest"
        onClick={() => setAberto(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Remover ({ids.length})
      </Button>
      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {ids.length} {rotulo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os registros serão excluídos definitivamente do banco. Itens com vínculos (OS, custos, lançamentos) não serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); remover(); }}
              disabled={removendo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
