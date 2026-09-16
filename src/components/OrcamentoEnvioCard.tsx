import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Printer, Send, ThumbsDown, ThumbsUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getExecutorEmail } from "@/lib/log-executor";

const ROTULO_RESPOSTA: Record<string, string> = {
  aprovado: "Aprovado pelo cliente",
  recusado: "Recusado pelo cliente",
  revisao: "Cliente pediu revisão",
};

function dataHora(valor?: string | null) {
  if (!valor) return null;
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Envio da proposta ao cliente: link público, data de envio e resposta registrada. */
export function OrcamentoEnvioCard({ os, osId }: { os: any; osId: string }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState<string>(os?.orcamento_resposta_motivo || "");
  const [gerando, setGerando] = useState(false);

  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const link = os?.orcamento_token ? `${origem}/proposta/${os.orcamento_token}` : "";

  const atualizar = async (payload: Record<string, any>, historico?: string) => {
    const { error } = await supabase.from("ordens_servico").update(payload as any).eq("id", osId);
    if (error) throw error;
    if (historico) {
      await supabase.from("historico_status_os" as any).insert({
        os_id: osId,
        status_anterior: os?.status ?? null,
        status_novo: os?.status ?? "orcamento",
        observacao: historico,
        executor_email: await getExecutorEmail(),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["os_detail", osId] });
    queryClient.invalidateQueries({ queryKey: ["orcamento_os", osId] });
    queryClient.invalidateQueries({ queryKey: ["alerta_orcamentos"] });
    queryClient.invalidateQueries({ queryKey: ["lembretes_painel"] });
  };

  const gerarLink = async () => {
    setGerando(true);
    try {
      const token = os?.orcamento_token || crypto.randomUUID();
      await atualizar(
        {
          orcamento_token: token,
          orcamento_link_gerado_em: new Date().toISOString(),
          orcamento_enviado_em: os?.orcamento_enviado_em || new Date().toISOString(),
        },
        "Link da proposta gerado para envio ao cliente",
      );
      const url = `${origem}/proposta/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado", { description: url });
      } catch {
        toast.success("Link gerado", { description: url });
      }
    } catch (e: any) {
      toast.error("Não foi possível gerar o link: " + e.message);
    } finally {
      setGerando(false);
    }
  };

  const marcarEnvio = useMutation({
    mutationFn: () => atualizar({ orcamento_enviado_em: new Date().toISOString() }, "Proposta enviada ao cliente"),
    onSuccess: () => toast.success("Envio registrado"),
    onError: (e: any) => toast.error("Erro ao registrar envio: " + e.message),
  });

  const registrarResposta = useMutation({
    mutationFn: (resposta: string) =>
      atualizar(
        {
          orcamento_resposta: resposta,
          orcamento_resposta_em: new Date().toISOString(),
          orcamento_resposta_motivo: motivo || null,
        },
        `Resposta do cliente: ${ROTULO_RESPOSTA[resposta] ?? resposta}${motivo ? ` — ${motivo}` : ""}`,
      ),
    onSuccess: () => toast.success("Resposta do cliente registrada"),
    onError: (e: any) => toast.error("Erro ao registrar resposta: " + e.message),
  });

  const resposta = os?.orcamento_resposta as string | null;

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="bg-muted/10 border-b border-border/50">
        <CardTitle className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <Send className="h-4 w-4 text-primary" /> Envio ao cliente
          {os?.orcamento_enviado_em ? (
            <Badge variant="outline" className="text-[9px] font-bold uppercase">
              Enviado em {dataHora(os.orcamento_enviado_em)}
            </Badge>
          ) : null}
          {resposta ? (
            <Badge
              className={`text-[9px] font-bold uppercase ${
                resposta === "aprovado"
                  ? "bg-emerald-500 text-white"
                  : resposta === "recusado"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-amber-400 text-slate-900"
              }`}
            >
              {ROTULO_RESPOSTA[resposta] ?? resposta} · {dataHora(os.orcamento_resposta_em)}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={gerarLink}
            disabled={gerando}
            className="h-9 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"
          >
            <Link2 className="mr-2 h-3.5 w-3.5" /> {os?.orcamento_token ? "Copiar link do cliente" : "Gerar link do cliente"}
          </Button>
          <Button
            variant="outline"
            className="h-9 text-[10px] font-black uppercase tracking-widest"
            onClick={() => window.open(`/os/${osId}/proposta?print=1`, "_blank")}
          >
            <Printer className="mr-2 h-3.5 w-3.5" /> Gerar PDF para anexar
          </Button>
          <Button
            variant="outline"
            className="h-9 text-[10px] font-black uppercase tracking-widest"
            onClick={() => marcarEnvio.mutate()}
            disabled={marcarEnvio.isPending}
          >
            <Send className="mr-2 h-3.5 w-3.5" /> Registrar envio agora
          </Button>
        </div>

        {link ? (
          <div className="flex items-center gap-2">
            <Input readOnly value={link} className="h-9 bg-muted/30 text-xs" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copiar link"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success("Link copiado");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            O link abre a proposta para o cliente sem precisar de senha. Gere o link ou anexe o PDF no e-mail.
          </p>
        )}

        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resposta do cliente</p>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo / observação do cliente (opcional em aprovações, obrigatório em recusa e revisão)"
            className="min-h-[70px] text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-9 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500"
              onClick={() => registrarResposta.mutate("aprovado")}
              disabled={registrarResposta.isPending}
            >
              <ThumbsUp className="mr-2 h-3.5 w-3.5" /> Aprovado
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-9 text-[10px] font-black uppercase tracking-widest"
              onClick={() => {
                if (!motivo.trim()) {
                  toast.error("Informe o motivo da recusa");
                  return;
                }
                registrarResposta.mutate("recusado");
              }}
              disabled={registrarResposta.isPending}
            >
              <ThumbsDown className="mr-2 h-3.5 w-3.5" /> Recusado
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-[10px] font-black uppercase tracking-widest"
              onClick={() => {
                if (!motivo.trim()) {
                  toast.error("Descreva o que o cliente pediu para revisar");
                  return;
                }
                registrarResposta.mutate("revisao");
              }}
              disabled={registrarResposta.isPending}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Pediu revisão
            </Button>
          </div>
          {os?.orcamento_resposta_motivo ? (
            <p className="text-[11px] text-muted-foreground">
              Última anotação: {os.orcamento_resposta_motivo}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
