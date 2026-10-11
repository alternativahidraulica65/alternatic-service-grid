import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, ExternalLink, Mail, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selecionados, setSelecionados] = useState<string[]>([]);

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

  function alternarSelecao(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function definirLida(ids: string[], lida: boolean) {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida, lida_em: lida ? new Date().toISOString() : null })
      .in("id", ids);
    if (error) toast.error("Não foi possível atualizar as notificações.");
    else setSelecionados([]);
    queryClient.invalidateQueries({ queryKey: ["notificacoes_sino"] });
  }

  function marcarLida(id: string) {
    return definirLida([id], true);
  }

  async function marcarTodas() {
    const ids = naoLidas.map((n) => n.id);
    if (ids.length === 0) return;
    await definirLida(ids, true);
    if (ids.length > 0) toast.success("Todas as notificações foram lidas.");
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
          {selecionados.length > 0 ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-widest">
                {selecionados.length} selecionada{selecionados.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => definirLida(selecionados, true)}
                  className="h-7 text-[10px] font-bold uppercase"
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> Lida
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => definirLida(selecionados, false)}
                  className="h-7 text-[10px] font-bold uppercase"
                >
                  <Mail className="mr-1 h-3.5 w-3.5" /> Não lida
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelecionados([])}
                  aria-label="Limpar seleção"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <>
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
            </>
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
                className={`flex items-start gap-2.5 border-b border-border/50 px-3 py-3 last:border-0 ${
                  selecionados.includes(n.id) ? "bg-primary/10" : n.lida ? "opacity-60" : "bg-amber-400/5"
                }`}
              >
                <Checkbox
                  checked={selecionados.includes(n.id)}
                  onCheckedChange={() => alternarSelecao(n.id)}
                  aria-label={`Selecionar: ${n.titulo_enviado || "Aviso"}`}
                  className="mt-0.5 shrink-0"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !n.lida && marcarLida(n.id)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !n.lida) {
                      e.preventDefault();
                      marcarLida(n.id);
                    }
                  }}
                  title={n.lida ? "Clique e use a seleção para marcar como não lida" : "Clique para marcar como lida"}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <p className="text-xs font-bold leading-tight">
                    {n.titulo_enviado || "Aviso"}
                    {!n.lida && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" />}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{n.mensagem_enviada}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{dataHora(n.data_envio)}</span>
                    {n.os_id && (
                      <Link
                        to="/os/$id"
                        params={{ id: n.os_id }}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                      >
                        Abrir OS <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
