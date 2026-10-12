import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Pause, Play, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_SUB, type StatusSub } from "@/lib/subservicos";

export const Route = createFileRoute("/_authenticated/producao/minha-bancada")({
  head: () => ({
    meta: [
      { title: "Minha Bancada | Alternativa Hidráulica" },
      { name: "description", content: "Fila de serviços da bancada do operador, pronta para celular e tablet." },
      { property: "og:title", content: "Minha Bancada | Alternativa Hidráulica" },
      { property: "og:description", content: "Serviços da sua bancada em ordem, com iniciar, pausar e concluir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhaBancada,
});

function MinhaBancada() {
  const qc = useQueryClient();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [pausa, setPausa] = useState<any>(null);
  const [motivo, setMotivo] = useState("");

  const { data: perfilId } = useQuery({
    queryKey: ["meu_perfil_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_profile_id");
      return (data as string | null) ?? null;
    },
  });

  const { data: bancadas = [] } = useQuery({
    queryKey: ["mb_bancadas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancadas" as any).select("*").eq("ativo", true).order("codigo");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const minhas = bancadas.filter((b) => perfilId && b.usuario_id === perfilId);
  const bancada = bancadas.find((b) => b.id === escolhida) ?? minhas[0] ?? null;

  const { data: fila = [], isLoading } = useQuery({
    queryKey: ["mb_fila", bancada?.id],
    enabled: !!bancada,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_subservicos" as any)
        .select("*, ordens_servico(id, numero_os, cliente, prioridade)")
        .eq("bancada_id", bancada.id)
        .eq("destino", "interno")
        .neq("status", "concluido")
        .order("ordem_fila", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const atualizar = async (id: string, patch: Record<string, any>, msg: string) => {
    const { error } = await supabase.from("os_subservicos" as any).update(patch).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["mb_fila"] });
  };
  const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  const emAndamento = fila.filter((s) => s.status === "em_andamento").length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-3 sm:p-6">
      <BotaoVoltar fallback="/dashboard" />

      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
          <Wrench className="h-4 w-4 text-primary" /> Minha bancada
        </div>
        {bancada ? (
          <>
            <h1 className="mt-1 text-2xl font-black">{bancada.codigo} — {bancada.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {fila.length} serviço(s) na fila{emAndamento ? ` · ${emAndamento} em andamento` : ""}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma bancada vinculada ao seu usuário. Peça ao gestor para atribuir você no Orquestrador, ou escolha abaixo.
          </p>
        )}
        {(minhas.length !== 1) && bancadas.length > 0 && (
          <Select value={bancada?.id ?? ""} onValueChange={setEscolhida}>
            <SelectTrigger className="mt-3 h-12"><SelectValue placeholder="Escolher bancada" /></SelectTrigger>
            <SelectContent>
              {bancadas.map((b) => <SelectItem key={b.id} value={b.id}>{b.codigo} — {b.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {bancada && isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {bancada && !isLoading && fila.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Nenhum serviço pendente nesta bancada.
        </div>
      )}

      <div className="space-y-3">
        {fila.map((s, i) => {
          const os = s.ordens_servico;
          const ativo = s.status === "em_andamento";
          return (
            <div key={s.id} className={`rounded-md border bg-card p-4 ${ativo ? "border-primary" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-black text-primary">#{i + 1}</div>
                  <div className="text-lg font-bold leading-tight">
                    {s.componente}{s.quantidade > 1 && <span className="font-normal text-muted-foreground"> × {s.quantidade}</span>}
                  </div>
                  {os && (
                    <Link to="/os/$id" params={{ id: os.id }} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
                      {os.numero_os} · {os.cliente}
                    </Link>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={ativo ? "default" : "outline"} className="uppercase">{STATUS_SUB[s.status as StatusSub] ?? s.status}</Badge>
                  {os?.prioridade && ["alta", "urgente"].includes(String(os.prioridade).toLowerCase()) && (
                    <Badge variant="destructive" className="uppercase">{os.prioridade}</Badge>
                  )}
                </div>
              </div>
              {s.descricao && <p className="mt-2 text-sm">{s.descricao}</p>}
              {s.observacao && <p className="mt-1 text-sm text-muted-foreground">Obs: {s.observacao}</p>}
              {s.motivo_pausa && <p className="mt-1 text-sm text-destructive">Pausa: {s.motivo_pausa}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {ativo ? (
                  <Button variant="outline" className="h-12 gap-2" onClick={() => { setPausa(s); setMotivo(""); }}>
                    <Pause className="h-5 w-5" /> Pausar
                  </Button>
                ) : (
                  <Button className="h-12 gap-2" onClick={() => atualizar(s.id, { status: "em_andamento", iniciado_em: s.iniciado_em ?? new Date().toISOString(), motivo_pausa: null }, "Serviço iniciado")}>
                    <Play className="h-5 w-5" /> Iniciar
                  </Button>
                )}
                <Button variant="outline" className="h-12 gap-2" onClick={async () => atualizar(s.id, { status: "concluido", concluido_em: new Date().toISOString(), concluido_por: await uid() }, "Serviço concluído")}>
                  <CheckCircle2 className="h-5 w-5" /> Concluir
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!pausa} onOpenChange={(o) => !o && setPausa(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da pausa</DialogTitle></DialogHeader>
          <Input className="h-12" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: aguardando peça" />
          <DialogFooter>
            <Button className="h-12" disabled={!motivo.trim()} onClick={async () => {
              await atualizar(pausa.id, { status: "pausado", motivo_pausa: motivo.trim() }, "Serviço pausado");
              setPausa(null);
            }}>Confirmar pausa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
