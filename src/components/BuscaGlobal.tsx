import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Users, Box, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Resultado {
  tipo: "os" | "cliente" | "peca";
  id: string;
  titulo: string;
  detalhe: string;
}

/**
 * Busca global (Ctrl+K / Cmd+K): encontra OS pelo número, cliente, equipamento
 * ou peça e leva direto para a tela correspondente.
 */
export function BuscaGlobal() {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberto((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const busca = termo.trim();
    if (!aberto || busca.length < 2) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    const t = setTimeout(async () => {
      const like = `%${busca}%`;
      const [osRes, clientesRes, pecasRes] = await Promise.all([
        supabase
          .from("ordens_servico")
          .select("id, numero_os, cliente, descricao, status")
          .or(`numero_os.ilike.${like},cliente.ilike.${like},descricao.ilike.${like}`)
          .order("criado_em", { ascending: false })
          .limit(8),
        supabase
          .from("clientes")
          .select("id, nome, cnpj")
          .or(`nome.ilike.${like},cnpj.ilike.${like}`)
          .limit(5),
        supabase
          .from("os_pecas_rastreio" as any)
          .select("id, nome, localizacao_fisica, os_id")
          .ilike("nome", like)
          .limit(5),
      ]);

      if (cancelado) return;
      const lista: Resultado[] = [
        ...((osRes.data as any[]) ?? []).map((o) => ({
          tipo: "os" as const,
          id: o.id,
          titulo: `${o.numero_os} · ${o.cliente ?? ""}`,
          detalhe: o.descricao || o.status || "",
        })),
        ...((clientesRes.data as any[]) ?? []).map((c) => ({
          tipo: "cliente" as const,
          id: c.id,
          titulo: c.nome,
          detalhe: c.cnpj || "",
        })),
        ...((pecasRes.data as any[]) ?? []).map((p) => ({
          tipo: "peca" as const,
          id: p.os_id,
          titulo: p.nome,
          detalhe: p.localizacao_fisica ? `Local: ${p.localizacao_fisica}` : "Peça da OS",
        })),
      ];
      setResultados(lista);
      setCarregando(false);
    }, 250);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termo, aberto]);

  const abrir = (r: Resultado) => {
    setAberto(false);
    setTermo("");
    if (r.tipo === "cliente") navigate({ to: "/clientes/$id", params: { id: r.id } });
    else navigate({ to: "/os/$id", params: { id: r.id } });
  };

  const porTipo = (tipo: Resultado["tipo"]) => resultados.filter((r) => r.tipo === tipo);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5">
      <CommandInput
        placeholder="Buscar OS, cliente, equipamento ou peça..."
        value={termo}
        onValueChange={setTermo}
      />
      <CommandList>
        {termo.trim().length < 2 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Search className="h-4 w-4" /> Digite ao menos 2 caracteres
          </div>
        ) : carregando ? (
          <div className="px-4 py-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Buscando...
          </div>
        ) : (
          <>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {porTipo("os").length > 0 && (
              <CommandGroup heading="Ordens de Serviço">
                {porTipo("os").map((r) => (
                  <CommandItem key={`os-${r.id}`} value={`os-${r.titulo}-${r.id}`} onSelect={() => abrir(r)}>
                    <ClipboardList className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-bold">{r.titulo}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{r.detalhe}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {porTipo("cliente").length > 0 && (
              <CommandGroup heading="Clientes">
                {porTipo("cliente").map((r) => (
                  <CommandItem key={`cli-${r.id}`} value={`cli-${r.titulo}-${r.id}`} onSelect={() => abrir(r)}>
                    <Users className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-bold">{r.titulo}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{r.detalhe}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {porTipo("peca").length > 0 && (
              <CommandGroup heading="Peças">
                {porTipo("peca").map((r) => (
                  <CommandItem key={`peca-${r.id}`} value={`peca-${r.titulo}-${r.id}`} onSelect={() => abrir(r)}>
                    <Box className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-bold">{r.titulo}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{r.detalhe}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
