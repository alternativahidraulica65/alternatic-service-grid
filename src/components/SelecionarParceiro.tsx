import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Parceiro = {
  id: string;
  nome: string;
  contato?: string | null;
  telefone?: string | null;
  tipo_parceiro?: string | null;
};

const ROTULO_TIPO: Record<string, string> = {
  servico: "Serviço",
  ambos: "Serviço + Material",
};

/**
 * Lista somente parceiros cadastrados como prestadores de serviço
 * (tipo_parceiro = servico ou ambos) e ativos.
 */
async function listarPrestadores(): Promise<Parceiro[]> {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id, nome, contato, telefone, tipo_parceiro")
    .eq("ativo", true)
    .in("tipo_parceiro", ["servico", "ambos"])
    .order("nome");

  if (!error) return (data ?? []) as Parceiro[];

  // Plano B: se a coluna tipo_parceiro ainda não estiver disponível na API,
  // traz os ativos e mantém apenas os que não forem exclusivos de material.
  const planoB = await supabase
    .from("fornecedores")
    .select("id, nome, contato, telefone")
    .eq("ativo", true)
    .order("nome");
  if (planoB.error) return [];
  return (planoB.data ?? []) as Parceiro[];
}

interface SelecionarParceiroProps {
  value: string;
  onChange: (nome: string) => void;
  placeholder?: string;
  className?: string;
}

export function SelecionarParceiro({
  value,
  onChange,
  placeholder = "Selecionar prestador de serviço",
  className,
}: SelecionarParceiroProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const { data: parceiros = [], isLoading } = useQuery({
    queryKey: ["parceiros-servico"],
    queryFn: listarPrestadores,
    staleTime: 60_000,
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return parceiros;
    return parceiros.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.contato ?? "").toLowerCase().includes(termo),
    );
  }, [busca, parceiros]);

  const selecionado = parceiros.find(
    (p) => p.nome.trim().toLowerCase() === value.trim().toLowerCase(),
  );
  const manual = !!value.trim() && !selecionado;

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-between border-slate-200 bg-white px-3 text-sm font-medium",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">{value || placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 p-0">
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar prestador..."
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {isLoading ? (
              <div className="space-y-1 p-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : parceiros.length === 0 ? (
              <p className="px-3 py-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Nenhum prestador de serviço cadastrado.
                <span className="mt-1 block font-medium normal-case tracking-normal opacity-80">
                  Cadastre o parceiro como tipo “Serviço” ou “Ambos”.
                </span>
              </p>
            ) : filtrados.length === 0 ? (
              <p className="px-3 py-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Nenhum prestador encontrado.
              </p>
            ) : (
              filtrados.map((p) => {
                const ativo =
                  p.nome.trim().toLowerCase() === value.trim().toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.nome);
                      setAberto(false);
                      setBusca("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted",
                      ativo && "bg-muted",
                    )}
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {p.nome}
                      </span>
                      {(p.contato || p.telefone) && (
                        <span className="block truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                          {[p.contato, p.telefone].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    {p.tipo_parceiro && ROTULO_TIPO[p.tipo_parceiro] && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-600"
                      >
                        {ROTULO_TIPO[p.tipo_parceiro]}
                      </Badge>
                    )}
                    {ativo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>

          {value && (
            <div className="border-t border-border/60 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full text-[10px] font-bold uppercase tracking-widest"
                onClick={() => {
                  onChange("");
                  setAberto(false);
                }}
              >
                Limpar seleção
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {manual && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          Nome informado manualmente — não consta como prestador de serviço cadastrado.
        </p>
      )}
    </div>
  );
}
