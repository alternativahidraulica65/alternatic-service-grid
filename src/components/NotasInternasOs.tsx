import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function dataHora(valor?: string | null) {
  if (!valor) return "";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Notas internas da OS — comentários da equipe com menção a colegas.
 * Nunca saem no documento do cliente.
 */
export function NotasInternasOs({ osId }: { osId: string }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");

  const { data: colegas = [] } = useQuery({
    queryKey: ["usuarios_mencao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, user_id, nome, email")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: notas = [] } = useQuery({
    queryKey: ["os_notas", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_notas" as any)
        .select("*")
        .eq("os_id", osId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!osId,
  });

  const mencionadosNoTexto = useMemo(() => {
    const marcados = (texto.match(/@([\wÀ-ÿ.]+)/g) || []).map((m) => m.slice(1).toLowerCase());
    return colegas.filter((c) =>
      marcados.some((m) => String(c.nome || "").toLowerCase().startsWith(m) || String(c.email || "").startsWith(m)),
    );
  }, [texto, colegas]);

  const salvar = useMutation({
    mutationFn: async () => {
      const conteudo = texto.trim();
      if (!conteudo) throw new Error("Escreva a nota antes de salvar.");
      const { data: sessao } = await supabase.auth.getUser();
      const autorId = sessao.user?.id ?? null;
      const autor = colegas.find((c) => c.user_id === autorId);
      const { error } = await supabase.from("os_notas" as any).insert({
        os_id: osId,
        autor_id: autorId,
        autor_nome: autor?.nome || sessao.user?.email || "Usuário",
        texto: conteudo,
        mencionados: mencionadosNoTexto.map((c) => c.user_id).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["os_notas", osId] });
      toast.success("Nota interna registrada");
    },
    onError: (e: any) => toast.error("Erro ao salvar nota: " + e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("os_notas" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["os_notas", osId] });
      toast.success("Nota removida");
    },
    onError: (e: any) => toast.error("Não foi possível remover: " + e.message),
  });

  const nomeDoUsuario = (userId: string) => colegas.find((c) => c.user_id === userId)?.nome || "colega";

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="bg-muted/10 border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <MessageSquare className="h-4 w-4 text-primary" /> Notas internas
          <Badge variant="outline" className="text-[9px] font-bold uppercase">
            Não sai no documento do cliente
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva um recado para a equipe. Use @nome para chamar um colega."
            className="min-h-[80px] text-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            {colegas.slice(0, 8).map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] font-bold"
                onClick={() => setTexto((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${String(c.nome).split(" ")[0]} `)}
              >
                <AtSign className="mr-1 h-3 w-3" /> {String(c.nome).split(" ")[0]}
              </Button>
            ))}
            <Button
              className="ml-auto h-9 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"
              onClick={() => salvar.mutate()}
              disabled={salvar.isPending}
            >
              Publicar nota
            </Button>
          </div>
          {mencionadosNoTexto.length > 0 ? (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Mencionando: {mencionadosNoTexto.map((c) => c.nome).join(", ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          {notas.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhuma nota interna nesta OS.</p>
          ) : (
            notas.map((n: any) => (
              <div key={n.id} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {n.autor_nome || "Usuário"} · {dataHora(n.criado_em)}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir nota"
                    className="h-7 w-7"
                    onClick={() => excluir.mutate(n.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-1 whitespace-pre-line text-xs">{n.texto}</p>
                {Array.isArray(n.mencionados) && n.mencionados.length > 0 ? (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-primary">
                    @{n.mencionados.map((id: string) => nomeDoUsuario(id)).join(" @")}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
