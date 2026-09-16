import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type Notificacao = {
  id: string;
  titulo_enviado: string | null;
  mensagem_enviada: string;
  data_envio: string;
  lida: boolean;
  os_id: string | null;
};

function dataHora(valor: string) {
  const d = new Date(valor);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
        " " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Sino de notificações: central de avisos do usuário logado. */
export function NotificacoesSino() {
  const queryClient = useQueryClient();

  const { data: notificacoes = [] } = useQuery({
    queryKey: ["notificacoes_sino"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as Notificacao[];
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, titulo_enviado, mensagem_enviada, data_envio, lida, os_id")
        .eq("usuario_id", auth.user.id)
        .order("data_envio", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as Notificacao[];
    },
    refetchInterval: 30 * 1000,
  });

  const naoLidas = notificacoes.filter((n) => !n.lida);

  async function marcarLida(id: string) {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Não foi possível marcar como lida.");
    queryClient.invalidateQueries({ queryKey: ["notificacoes_sino"] });
  }

  async function marcarTodas() {
    const ids = naoLidas.map((n) => n.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .in("id", ids);
    if (error) toast.error("Não foi possível marcar todas.");
    else toast.success("Todas as notificações foram lidas.");
    queryClient.invalidateQueries({ queryKey: ["notificacoes_sino"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-400 hover:text-primary transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {naoLidas.length > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
              {naoLidas.length > 99 ? "99+" : naoLidas.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-widest">
            Notificações
            {naoLidas.length > 0 && (
              <Badge className="ml-2 bg-amber-400 text-slate-900 text-[10px] font-black">
                {naoLidas.length} nova{naoLidas.length > 1 ? "s" : ""}
              </Badge>
            )}
          </p>
          {naoLidas.length > 0 && (
            <Button variant="ghost" size="sm" onClick={marcarTodas} className="h-7 text-[10px] font-bold uppercase">
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notificacoes.length === 0 ? (
            <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            notificacoes.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0 ${
                  n.lida ? "opacity-60" : "bg-amber-400/5"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight">{n.titulo_enviado || "Aviso"}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{n.mensagem_enviada}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{dataHora(n.data_envio)}</span>
                    {n.os_id && (
                      <Link
                        to="/os/$id"
                        params={{ id: n.os_id }}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                      >
                        Abrir OS <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {!n.lida && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => marcarLida(n.id)}
                    aria-label="Marcar como lida"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
