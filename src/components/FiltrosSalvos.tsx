import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Save, Trash2, Loader2 } from "lucide-react";

interface FiltrosSalvosProps {
  /** Identificador da lista (ex.: "os", "clientes", "lancamentos"). */
  lista: string;
  /** Filtros atualmente aplicados na tela. */
  filtros: Record<string, any>;
  /** Chamado quando o usuário escolhe um filtro salvo. */
  onAplicar: (filtros: any) => void;
}

/**
 * Permite salvar a combinação de filtros de uma lista e reaplicá-la depois.
 * Os filtros ficam gravados no banco, por usuário (tabela filtros_salvos).
 */
export function FiltrosSalvos({ lista, filtros, onAplicar }: FiltrosSalvosProps) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const chave = ["filtros_salvos", lista];

  const { data: salvos = [] } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("filtros_salvos")
        .select("id, nome, filtros")
        .eq("lista", lista)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const salvar = async () => {
    const titulo = nome.trim();
    if (!titulo) {
      toast.error("Dê um nome para o filtro.");
      return;
    }
    setSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Sessão expirada.");
      const { error } = await (supabase as any)
        .from("filtros_salvos")
        .upsert(
          { user_id: userId, lista, nome: titulo, filtros },
          { onConflict: "user_id,lista,nome" },
        );
      if (error) throw error;
      setNome("");
      queryClient.invalidateQueries({ queryKey: chave });
      toast.success(`Filtro "${titulo}" salvo.`);
    } catch (e: any) {
      toast.error("Erro ao salvar filtro: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    const { error } = await (supabase as any).from("filtros_salvos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: chave });
    toast.success("Filtro removido.");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 font-bold uppercase text-[10px] tracking-widest">
          <Bookmark className="mr-2 h-4 w-4" />
          Filtros salvos{salvos.length > 0 ? ` (${salvos.length})` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-white">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest">
          Meus filtros
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {salvos.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum filtro salvo ainda.</p>
        )}
        {salvos.map((f: any) => (
          <DropdownMenuItem
            key={f.id}
            className="flex items-center justify-between gap-2"
            onSelect={(e) => {
              e.preventDefault();
              onAplicar(f.filtros ?? {});
              toast.success(`Filtro "${f.nome}" aplicado.`);
            }}
          >
            <span className="truncate text-xs font-semibold">{f.nome}</span>
            <button
              type="button"
              aria-label={`Excluir filtro ${f.nome}`}
              className="text-muted-foreground hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                excluir(f.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2 space-y-2">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do filtro atual"
            className="h-9 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
            }}
          />
          <Button
            size="sm"
            className="w-full h-9 font-black uppercase text-[10px] tracking-widest"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Salvar filtros atuais
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
