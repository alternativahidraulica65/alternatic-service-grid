import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Camera, CheckCircle2, Clock, Factory,
  Inbox, Pause, Play, Truck, UserX, Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { STATUS_SUB, type StatusSub } from "@/lib/subservicos";
import { faseDoStatus, ROTULO_FASE } from "@/lib/os-fluxo";

export const Route = createFileRoute("/_authenticated/producao/orquestrador")({
  head: () => ({
    meta: [
      { title: "Orquestrador de Oficina | Alternativa Hidráulica" },
      { name: "description", content: "Fila de subserviços, carga das bancadas e acompanhamento de terceiros." },
      { property: "og:title", content: "Orquestrador de Oficina | Alternativa Hidráulica" },
      { property: "og:description", content: "Controle de produção da oficina hidráulica em uma só tela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orquestrador,
});

const DIA = 86400000;
const hoje = () => new Date(new Date().toDateString()).getTime();
const corStatus: Record<string, string> = {
  aguardando: "bg-muted text-foreground",
  em_andamento: "bg-primary text-primary-foreground",
  pausado: "bg-destructive/15 text-destructive",
  enviado: "bg-secondary text-secondary-foreground",
  concluido: "bg-emerald-600/15 text-emerald-700",
};

async function quemSou() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function subirFotos(files: FileList | null, osId: string, tipo: string) {
  const caminhos: string[] = [];
  for (const f of Array.from(files ?? [])) {
    const path = `${osId}/subservicos/${tipo}-${crypto.randomUUID()}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("os-assets").upload(path, f);
    if (error) throw error;
    caminhos.push(path);
  }
  return caminhos;
}

function Orquestrador() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: subs = [] } = useQuery({
    queryKey: ["orq_subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_subservicos" as any)
        .select("*, ordens_servico(id, numero_os, cliente, prioridade, status)")
        .order("ordem_fila");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 30000,
  });

  const { data: operadores = [] } = useQuery({
    queryKey: ["orq_operadores"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id, nome, cargo, ativo").eq("ativo", true);
      return ((data ?? []) as any[]).filter((u) => ["operador", "tecnico", "gestor"].includes(String(u.cargo ?? "").toLowerCase()));
    },
  });

  const { data: terceiros = [] } = useQuery({
    queryKey: ["orq_terceiros"],
    queryFn: async () => {
      const { data } = await supabase.from("terceiros" as any).select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as any[];
    },
  });

  const { data: chegadas = [] } = useQuery({
    queryKey: ["orq_chegadas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ordens_servico")
        .select("id, numero_os, cliente, status, status_financeiro, tecnico_id, operador_atribuido, data_abertura, criado_em")
        .not("status", "in", "(entregue,encerrada,encerrado)")
        .order("criado_em", { ascending: false })
        .limit(60);
      return (data ?? []) as any[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["orq_subs"] });

  const atualizar = async (id: string, patch: Record<string, any>, msg?: string) => {
    const { error } = await supabase.from("os_subservicos" as any).update(patch).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    if (msg) toast.success(msg);
    refresh();
  };

  const semDestino = subs.filter((s) => s.destino === "pendente" && s.status !== "concluido");
  const internos = subs.filter((s) => s.destino === "interno" && s.status !== "concluido");
  const externos = subs.filter((s) => s.destino === "terceiro" && s.status !== "concluido");
  const vencidos = externos.filter((s) => s.prazo_retorno && new Date(s.prazo_retorno + "T23:59").getTime() < Date.now());
  const ociosos = operadores.filter((o) => !internos.some((s) => s.operador_id === o.id));
  const recentes = chegadas.filter((o) => Date.now() - new Date(o.criado_em ?? o.data_abertura).getTime() < 2 * DIA);
  const semChecklist = chegadas.filter((o) => ["criacao", "checklist"].includes(faseDoStatus(o.status)));
  const semResp = chegadas.filter((o) => !o.tecnico_id && !o.operador_atribuido);
  const concluidosHoje = subs.filter((s) => s.concluido_em && new Date(s.concluido_em).getTime() >= hoje()).length;

  const nomeOp = (id?: string) => operadores.find((o) => o.id === id)?.nome ?? "—";

  // ===== Diálogos =====
  const [destinar, setDestinar] = useState<any | null>(null);
  const [formDest, setFormDest] = useState<any>({});
  const [retorno, setRetorno] = useState<any | null>(null);
  const [fotosRet, setFotosRet] = useState<FileList | null>(null);
  const [obsRet, setObsRet] = useState("");
  const [pausa, setPausa] = useState<any | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const abrirDestino = (s: any, tipo: "interno" | "terceiro") => {
    setDestinar({ ...s, tipo });
    setFormDest({ operador_id: s.operador_id ?? "", terceiro_id: "", quantidade: s.quantidade ?? 1, prazo_retorno: "", observacao: s.observacao ?? "", fotos: null });
  };

  const confirmarDestino = async () => {
    if (!destinar) return;
    setSalvando(true);
    try {
      const uid = await quemSou();
      if (destinar.tipo === "interno") {
        if (!formDest.operador_id) throw new Error("Selecione o operador / bancada.");
        const fila = internos.filter((s) => s.operador_id === formDest.operador_id).length;
        await atualizar(destinar.id, {
          destino: "interno", operador_id: formDest.operador_id, ordem_fila: fila,
          status: "aguardando", observacao: formDest.observacao || null,
        }, `Destinado para ${nomeOp(formDest.operador_id)}`);
      } else {
        const t = terceiros.find((x) => x.id === formDest.terceiro_id);
        if (!t) throw new Error("Selecione o terceiro.");
        if (!(Number(formDest.quantidade) > 0)) throw new Error("Informe a quantidade.");
        const fotos = await subirFotos(formDest.fotos, destinar.os_id, "envio");
        await atualizar(destinar.id, {
          destino: "terceiro", terceiro_id: t.id, terceiro_nome: t.nome, status: "enviado",
          quantidade: Number(formDest.quantidade), prazo_retorno: formDest.prazo_retorno || null,
          enviado_em: new Date().toISOString(), enviado_por: uid, fotos_envio: fotos,
          observacao: formDest.observacao || null,
        }, `Enviado para ${t.nome}`);
      }
      setDestinar(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarRetorno = async () => {
    if (!retorno) return;
    setSalvando(true);
    try {
      const uid = await quemSou();
      const fotos = await subirFotos(fotosRet, retorno.os_id, "retorno");
      await atualizar(retorno.id, {
        status: "concluido", retornado_em: new Date().toISOString(), retornado_por: uid,
        concluido_em: new Date().toISOString(), concluido_por: uid, fotos_retorno: fotos,
        observacao: [retorno.observacao, obsRet && `Retorno: ${obsRet}`].filter(Boolean).join(" | ") || null,
      }, "Retorno registrado");
      setRetorno(null); setFotosRet(null); setObsRet("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const mover = async (lista: any[], idx: number, dir: -1 | 1) => {
    const alvo = lista[idx + dir];
    if (!alvo) return;
    const atual = lista[idx];
    await Promise.all([
      supabase.from("os_subservicos" as any).update({ ordem_fila: idx + dir }).eq("id", atual.id),
      supabase.from("os_subservicos" as any).update({ ordem_fila: idx }).eq("id", alvo.id),
    ]);
    refresh();
  };

  const iniciar = (s: any) => atualizar(s.id, { status: "em_andamento", iniciado_em: s.iniciado_em ?? new Date().toISOString(), motivo_pausa: null }, "Serviço iniciado");
  const concluir = async (s: any) => atualizar(s.id, { status: "concluido", concluido_em: new Date().toISOString(), concluido_por: await quemSou() }, "Serviço concluído");

  const kpis = [
    { titulo: "Chegaram (48h)", valor: recentes.length, icone: Inbox, alerta: false },
    { titulo: "Aguardando checklist", valor: semChecklist.length, icone: Wrench, alerta: semChecklist.length > 0 },
    { titulo: "OS sem responsável", valor: semResp.length, icone: UserX, alerta: semResp.length > 0 },
    { titulo: "Subserviços sem destino", valor: semDestino.length, icone: AlertTriangle, alerta: semDestino.length > 0 },
    { titulo: "Operadores ociosos", valor: ociosos.length, icone: Factory, alerta: ociosos.length > 0 },
    { titulo: "Terceiros vencidos", valor: vencidos.length, icone: Truck, alerta: vencidos.length > 0 },
    { titulo: "Concluídos hoje", valor: concluidosHoje, icone: CheckCircle2, alerta: false },
  ];

  const LinhaOs = ({ s }: { s: any }) => (
    <Link to="/os/$id" params={{ id: s.os_id }} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary">
      OS {s.ordens_servico?.numero_os ?? ""} · {s.ordens_servico?.cliente ?? ""}
    </Link>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Orquestrador de Oficina</h1>
          <p className="text-sm text-muted-foreground">Bata o olho: o que chegou, o que está parado e quem está livre.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.history.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => (
          <Card key={k.titulo} className={k.alerta ? "border-primary bg-primary/10" : ""}>
            <CardContent className="p-3">
              <k.icone className={`mb-1 h-4 w-4 ${k.alerta ? "text-foreground" : "text-muted-foreground"}`} />
              <div className="text-2xl font-black">{k.valor}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.titulo}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="fila">
        <TabsList className="flex-wrap">
          <TabsTrigger value="fila">Fila sem destino ({semDestino.length})</TabsTrigger>
          <TabsTrigger value="bancadas">Bancadas ({internos.length})</TabsTrigger>
          <TabsTrigger value="terceiros">Terceiros ({externos.length})</TabsTrigger>
          <TabsTrigger value="chegadas">Chegadas e triagem ({chegadas.length})</TabsTrigger>
        </TabsList>

        {/* Fila */}
        <TabsContent value="fila" className="space-y-2">
          {semDestino.length === 0 && <Vazio texto="Nenhum subserviço aguardando destino." />}
          {semDestino.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <LinhaOs s={s} />
                  <div className="font-bold">{s.componente} <span className="font-normal text-muted-foreground">— {s.descricao}</span></div>
                </div>
                {s.ordens_servico?.prioridade && <Badge variant="outline" className="uppercase">{s.ordens_servico.prioridade}</Badge>}
                <Button size="sm" className="gap-1" onClick={() => abrirDestino(s, "interno")}><Factory className="h-4 w-4" /> Bancada</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => abrirDestino(s, "terceiro")}><Truck className="h-4 w-4" /> Terceiro</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Bancadas */}
        <TabsContent value="bancadas">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {operadores.map((op) => {
              const fila = internos.filter((s) => s.operador_id === op.id).sort((a, b) => a.ordem_fila - b.ordem_fila);
              return (
                <Card key={op.id} className={`w-72 shrink-0 ${fila.length === 0 ? "border-primary" : ""}`}>
                  <CardHeader className="border-b p-3">
                    <CardTitle className="flex items-center justify-between text-sm font-black uppercase">
                      {op.nome}
                      <Badge className={fila.length === 0 ? "bg-primary text-primary-foreground" : ""} variant={fila.length ? "outline" : "default"}>
                        {fila.length === 0 ? "Livre" : `${fila.length} na fila`}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-2">
                    {fila.length === 0 && <p className="p-2 text-xs text-muted-foreground">Sem serviço. Destine algo da fila.</p>}
                    {fila.map((s, i) => (
                      <div key={s.id} className="rounded-md border border-border bg-card p-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-muted-foreground">#{i + 1}</span> <LinhaOs s={s} />
                            <div className="text-sm font-bold leading-tight">{s.componente}</div>
                            <div className="truncate text-xs text-muted-foreground">{s.descricao}</div>
                          </div>
                          <div className="flex flex-col">
                            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => mover(fila, i, -1)} title="Subir na fila"><ArrowUp className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === fila.length - 1} onClick={() => mover(fila, i, 1)} title="Descer na fila"><ArrowDown className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <Badge className={`mt-1 text-[9px] uppercase ${corStatus[s.status]}`}>{STATUS_SUB[s.status as StatusSub]}</Badge>
                        {s.motivo_pausa && <p className="mt-1 text-[11px] text-destructive">Pausa: {s.motivo_pausa}</p>}
                        {s.observacao && <p className="mt-1 text-[11px] text-muted-foreground">Obs: {s.observacao}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.status !== "em_andamento" && <Button size="sm" className="h-7 gap-1 text-[10px]" onClick={() => iniciar(s)}><Play className="h-3 w-3" /> Iniciar</Button>}
                          {s.status === "em_andamento" && <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => { setPausa(s); setMotivo(""); }}><Pause className="h-3 w-3" /> Pausar</Button>}
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => concluir(s)}><CheckCircle2 className="h-3 w-3" /> Concluir</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => abrirDestino(s, "interno")}>Trocar</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Terceiros */}
        <TabsContent value="terceiros" className="space-y-2">
          {externos.length === 0 && <Vazio texto="Nada com terceiros no momento." />}
          {externos.map((s) => {
            const atraso = s.prazo_retorno ? Math.floor((hoje() - new Date(s.prazo_retorno + "T00:00").getTime()) / DIA) : null;
            return (
              <Card key={s.id} className={atraso !== null && atraso > 0 ? "border-destructive" : ""}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <LinhaOs s={s} />
                    <div className="font-bold">{s.componente} <span className="font-normal text-muted-foreground">× {s.quantidade}</span></div>
                    <div className="text-xs text-muted-foreground">
                      {s.terceiro_nome} · enviado {s.enviado_em ? new Date(s.enviado_em).toLocaleDateString("pt-BR") : "—"} · {s.fotos_envio?.length ?? 0} foto(s)
                    </div>
                  </div>
                  <Badge variant="outline" className={atraso !== null && atraso > 0 ? "border-destructive text-destructive" : ""}>
                    <Clock className="mr-1 h-3 w-3" />
                    {s.prazo_retorno ? (atraso! > 0 ? `${atraso} dia(s) em atraso` : `Prazo ${new Date(s.prazo_retorno + "T00:00").toLocaleDateString("pt-BR")}`) : "Sem prazo"}
                  </Badge>
                  <Button size="sm" className="gap-1" onClick={() => { setRetorno(s); setObsRet(""); setFotosRet(null); }}><CheckCircle2 className="h-4 w-4" /> Registrar retorno</Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Chegadas */}
        <TabsContent value="chegadas">
          <Card>
            <CardContent className="divide-y p-0">
              {chegadas.map((o) => {
                const subsOs = subs.filter((s) => s.os_id === o.id);
                const abertos = subsOs.filter((s) => s.status !== "concluido").length;
                return (
                  <Link key={o.id} to="/os/$id" params={{ id: o.id }} className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/40">
                    <span className="w-24 font-black">OS {o.numero_os}</span>
                    <span className="min-w-0 flex-1 truncate">{o.cliente}</span>
                    <Badge variant="outline">{ROTULO_FASE[faseDoStatus(o.status, o.status_financeiro)]}</Badge>
                    {!o.tecnico_id && !o.operador_atribuido && <Badge className="bg-primary text-primary-foreground">Sem responsável</Badge>}
                    {subsOs.length > 0 && <Badge variant="outline">{abertos}/{subsOs.length} subserviços abertos</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(o.criado_em ?? o.data_abertura).toLocaleDateString("pt-BR")}</span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Destinar */}
      <Dialog open={!!destinar} onOpenChange={(v) => !v && setDestinar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{destinar?.tipo === "interno" ? "Destinar para bancada" : "Enviar para terceiro"} — {destinar?.componente}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {destinar?.tipo === "interno" ? (
              <div>
                <Label>Operador / bancada</Label>
                <Select value={formDest.operador_id} onValueChange={(v) => setFormDest({ ...formDest, operador_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {operadores.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.nome} ({internos.filter((s) => s.operador_id === o.id).length} na fila)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label>Terceiro</Label>
                  <Select value={formDest.terceiro_id} onValueChange={(v) => setFormDest({ ...formDest, terceiro_id: v })}>
                    <SelectTrigger><SelectValue placeholder={terceiros.length ? "Selecione" : "Cadastre terceiros primeiro"} /></SelectTrigger>
                    <SelectContent>{terceiros.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Quantidade</Label><Input type="number" min={1} value={formDest.quantidade} onChange={(e) => setFormDest({ ...formDest, quantidade: e.target.value })} /></div>
                  <div><Label>Prazo de retorno</Label><Input type="date" value={formDest.prazo_retorno} onChange={(e) => setFormDest({ ...formDest, prazo_retorno: e.target.value })} /></div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Camera className="h-4 w-4" /> Fotos do envio</Label>
                  <Input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setFormDest({ ...formDest, fotos: e.target.files })} />
                </div>
              </>
            )}
            <div><Label>Observação</Label><Input value={formDest.observacao ?? ""} onChange={(e) => setFormDest({ ...formDest, observacao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button disabled={salvando} onClick={confirmarDestino}>{salvando ? "Salvando..." : "Confirmar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retorno */}
      <Dialog open={!!retorno} onOpenChange={(v) => !v && setRetorno(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Retorno de {retorno?.terceiro_nome} — {retorno?.componente}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="flex items-center gap-1"><Camera className="h-4 w-4" /> Fotos do retorno</Label><Input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setFotosRet(e.target.files)} /></div>
            <div><Label>Observação</Label><Input value={obsRet} onChange={(e) => setObsRet(e.target.value)} placeholder="Ex: retornou conforme" /></div>
          </div>
          <DialogFooter><Button disabled={salvando} onClick={confirmarRetorno}>{salvando ? "Salvando..." : "Dar baixa"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pausa */}
      <Dialog open={!!pausa} onOpenChange={(v) => !v && setPausa(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pausar — {pausa?.componente}</DialogTitle></DialogHeader>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (ex: aguardando peça)" />
          <DialogFooter>
            <Button onClick={async () => {
              if (!motivo.trim()) { toast.error("Informe o motivo da pausa."); return; }
              await atualizar(pausa.id, { status: "pausado", motivo_pausa: motivo.trim() }, "Serviço pausado");
              setPausa(null);
            }}>Pausar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{texto}</p>;
}
