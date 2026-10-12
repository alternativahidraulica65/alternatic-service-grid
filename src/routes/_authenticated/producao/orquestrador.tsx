import { BotaoVoltar } from "@/components/BotaoVoltar";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Camera, CheckCircle2, Clock, Factory,
  Calculator, Cog, Pause, Pencil, Play, Save, Truck, UserX, Wrench,
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
  beforeLoad: ({ context }) => {
    const c = context as any;
    // Acesso exclusivo: Diretor e Gestor.
    if (!c.isDiretor && !c.isGestor) {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
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

const PALAVRAS_TORNO = ["haste", "embolo", "êmbolo", "porca", "bucha", "pino", "eixo", "tampa", "guia", "olhal", "pistão", "pistao", "usinag", "torno", "fabricar"];
const ehUsinagem = (s: any) => PALAVRAS_TORNO.some((p) => `${s.componente ?? ""} ${s.descricao ?? ""}`.toLowerCase().includes(p));

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
      const { data } = await supabase.from("fornecedores" as any).select("id, nome").eq("ativo", true).in("tipo_parceiro", ["servico", "ambos"]).order("nome");
      return (data ?? []) as any[];
    },
  });

  const { data: bancadas = [] } = useQuery({
    queryKey: ["orq_bancadas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancadas" as any).select("*").eq("ativo", true).order("codigo");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: chegadas = [] } = useQuery({
    queryKey: ["orq_chegadas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ordens_servico")
        .select("id, numero_os, cliente, status, status_financeiro, tecnico_id, operador_atribuido, data_abertura, criado_em, prioridade")
        .not("status", "in", "(entregue,encerrada,encerrado)")
        .order("criado_em", { ascending: false })
        .limit(150);
      return (data ?? []) as any[];
    },
    refetchInterval: 30000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["orq_subs"] });

  const atualizar = async (id: string, patch: Record<string, any>, msg?: string) => {
    const { error } = await supabase.from("os_subservicos" as any).update(patch).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    if (msg) toast.success(msg);
    refresh();
  };

  const salvarBancada = async (b: any, patch: Record<string, any>, msg: string) => {
    const { error } = await supabase.from("bancadas" as any).update(patch).eq("id", b.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["orq_bancadas"] });
  };

  const bancadaDe = (s: any) =>
    bancadas.find((b) => b.id === s.bancada_id) ?? bancadas.find((b) => b.usuario_id && b.usuario_id === s.operador_id);

  const semDestino = subs.filter((s) => s.destino === "pendente" && s.status !== "concluido");
  const internos = subs.filter((s) => s.destino === "interno" && s.status !== "concluido");
  const externos = subs.filter((s) => s.destino === "terceiro" && s.status !== "concluido");
  const vencidos = externos.filter((s) => s.prazo_retorno && new Date(s.prazo_retorno + "T23:59").getTime() < Date.now());
  const filaDa = (b: any) => internos.filter((s) => bancadaDe(s)?.id === b.id).sort((a, c) => a.ordem_fila - c.ordem_fila);
  const usinagem = bancadas.filter((b) => b.is_usinagem);
  const pecasTorno = usinagem.flatMap(filaDa);
  const sugeridasTorno = semDestino.filter(ehUsinagem);
  const semBancada = internos.filter((s) => !bancadaDe(s));

  const paraAbrir = chegadas.filter((o) => ["criacao", "checklist", "laudo"].includes(faseDoStatus(o.status, o.status_financeiro)));
  const concluidosHoje = subs.filter((s) => s.concluido_em && new Date(s.concluido_em).getTime() >= hoje()).length;

  const nomeUsuario = (id?: string) => operadores.find((o) => o.id === id)?.nome;
  const nomeBancada = (b: any) => nomeUsuario(b?.usuario_id) ?? b?.tecnico_nome ?? "Sem responsável";

  // ===== Diálogos =====
  const [destinar, setDestinar] = useState<any | null>(null);
  const [formDest, setFormDest] = useState<any>({});
  const [retorno, setRetorno] = useState<any | null>(null);
  const [fotosRet, setFotosRet] = useState<FileList | null>(null);
  const [obsRet, setObsRet] = useState("");
  const [pausa, setPausa] = useState<any | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editNome, setEditNome] = useState<Record<string, string>>({});

  const abrirDestino = (s: any, tipo: "interno" | "terceiro", bancadaId?: string) => {
    setDestinar({ ...s, tipo });
    setFormDest({
      bancada_id: bancadaId ?? bancadaDe(s)?.id ?? (ehUsinagem(s) ? usinagem[0]?.id : "") ?? "",
      terceiro_id: "", quantidade: s.quantidade ?? 1, prazo_retorno: "", observacao: s.observacao ?? "", fotos: null,
    });
  };

  const confirmarDestino = async () => {
    if (!destinar) return;
    setSalvando(true);
    try {
      const uid = await quemSou();
      if (destinar.tipo === "interno") {
        const b = bancadas.find((x) => x.id === formDest.bancada_id);
        if (!b) throw new Error("Selecione a bancada.");
        await atualizar(destinar.id, {
          destino: "interno", bancada_id: b.id, operador_id: b.usuario_id ?? null, ordem_fila: filaDa(b).length,
          status: "aguardando", observacao: formDest.observacao || null,
        }, `Destinado para ${b.nome}`);
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
    { titulo: "OS para abrir / orçar", valor: paraAbrir.length, icone: Wrench, alerta: paraAbrir.length > 0, aba: "abrir" },
    { titulo: "Serviços nas bancadas", valor: internos.length, icone: Factory, alerta: false, aba: "bancadas" },
    { titulo: "Peças para o torneiro", valor: pecasTorno.length, icone: Cog, alerta: pecasTorno.length > 0, aba: "torno" },
    { titulo: "Peças com terceiros", valor: externos.length, icone: Truck, alerta: vencidos.length > 0, aba: "terceiros" },
    { titulo: "Sem destino", valor: semDestino.length, icone: AlertTriangle, alerta: semDestino.length > 0, aba: "fila" },
    { titulo: "Concluídos hoje", valor: concluidosHoje, icone: CheckCircle2, alerta: false, aba: "bancadas" },
  ];
  const [aba, setAba] = useState("abrir");

  const LinhaOs = ({ s }: { s: any }) => (
    <Link to="/os/$id" params={{ id: s.os_id }} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary">
      OS {s.ordens_servico?.numero_os ?? ""} · {s.ordens_servico?.cliente ?? ""}
    </Link>
  );

  const CardServico = ({ s, i, fila }: { s: any; i: number; fila: any[] }) => (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <span className="text-[10px] font-black text-primary">#{i + 1}</span> <LinhaOs s={s} />
          <div className="text-sm font-bold leading-tight">{s.componente}{s.quantidade > 1 && <span className="font-normal text-muted-foreground"> × {s.quantidade}</span>}</div>
          {s.descricao && <div className="truncate text-xs text-muted-foreground">{s.descricao}</div>}
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
  );

  // Fluxo da oficina — etapas na sequência real
  const etapas: { titulo: string; fases: string[] }[] = [
    { titulo: "Chegou / lavar / abrir", fases: ["criacao", "checklist"] },
    { titulo: "Diagnóstico (laudo)", fases: ["laudo"] },
    { titulo: "Levantar custos", fases: ["custos"] },
    { titulo: "Orçamento ao cliente", fases: ["orcamento", "aprovacao"] },
    { titulo: "Execução (terceiros, torno, montagem)", fases: ["execucao"] },
    { titulo: "Pintura / teste / pronto", fases: ["pronto"] },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Orquestrador de Oficina</h1>
          <p className="text-sm text-muted-foreground">O que precisa abrir, o que está em cada bancada, no torno e com terceiros.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.history.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <button key={k.titulo} onClick={() => setAba(k.aba)} className="text-left">
            <Card className={`transition-colors hover:border-primary ${k.alerta ? "border-primary bg-primary/10" : ""}`}>
              <CardContent className="p-3">
                <k.icone className={`mb-1 h-4 w-4 ${k.alerta ? "text-foreground" : "text-muted-foreground"}`} />
                <div className="text-2xl font-black">{k.valor}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.titulo}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="abrir">Para abrir ({paraAbrir.length})</TabsTrigger>
          <TabsTrigger value="bancadas">Bancadas ({internos.length})</TabsTrigger>
          <TabsTrigger value="torno">Torneiro ({pecasTorno.length})</TabsTrigger>
          <TabsTrigger value="terceiros">Terceiros ({externos.length})</TabsTrigger>
          <TabsTrigger value="fila">Sem destino ({semDestino.length})</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo da oficina</TabsTrigger>
        </TabsList>

        {/* Para abrir */}
        <TabsContent value="abrir" className="space-y-2">
          <p className="text-xs text-muted-foreground">Equipamentos que chegaram e ainda precisam ser lavados, abertos e diagnosticados para montar o orçamento.</p>
          {paraAbrir.length === 0 && <Vazio texto="Nenhuma OS aguardando abertura." />}
          {[...paraAbrir].sort((a, b) => new Date(a.criado_em ?? a.data_abertura).getTime() - new Date(b.criado_em ?? b.data_abertura).getTime()).map((o) => {
            const horas = Math.floor((Date.now() - new Date(o.criado_em ?? o.data_abertura).getTime()) / 3600000);
            return (
              <Link key={o.id} to="/os/$id" params={{ id: o.id }}>
                <Card className={`hover:border-primary ${horas > 48 ? "border-destructive" : ""}`}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <span className="w-28 font-black">OS {o.numero_os}</span>
                    <span className="min-w-0 flex-1 truncate">{o.cliente}</span>
                    <Badge variant="outline">{ROTULO_FASE[faseDoStatus(o.status, o.status_financeiro)]}</Badge>
                    {!o.tecnico_id && !o.operador_atribuido && <Badge className="bg-primary text-primary-foreground"><UserX className="mr-1 h-3 w-3" />Sem responsável</Badge>}
                    {o.prioridade && <Badge variant="outline" className="uppercase">{o.prioridade}</Badge>}
                    <span className={`flex items-center gap-1 text-xs ${horas > 48 ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3" /> {horas < 24 ? `${horas}h` : `${Math.floor(horas / 24)} dia(s)`} parada
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </TabsContent>

        {/* Bancadas */}
        <TabsContent value="bancadas" className="space-y-3">
          {semBancada.length > 0 && (
            <p className="rounded-md border border-primary bg-primary/10 p-2 text-xs">{semBancada.length} serviço(s) internos sem bancada definida — use "Trocar" na aba Sem destino ou reatribua.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bancadas.map((b) => {
              const fila = filaDa(b);
              const nome = editNome[b.id];
              return (
                <Card key={b.id} className={fila.length === 0 ? "border-primary" : ""}>
                  <CardHeader className="space-y-2 border-b p-3">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm font-black uppercase">
                      {nome !== undefined ? (
                        <div className="flex flex-1 gap-1">
                          <Input className="h-7" value={nome} onChange={(e) => setEditNome({ ...editNome, [b.id]: e.target.value })} />
                          <Button size="icon" className="h-7 w-7" onClick={async () => {
                            if (!nome.trim()) return;
                            await salvarBancada(b, { nome: nome.trim() }, "Nome da bancada salvo");
                            const { [b.id]: _, ...rest } = editNome; setEditNome(rest);
                          }}><Save className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <button className="flex items-center gap-1 hover:text-primary" onClick={() => setEditNome({ ...editNome, [b.id]: b.nome })}>
                          {b.is_usinagem && <Cog className="h-4 w-4" />}{b.nome} <Pencil className="h-3 w-3 opacity-50" />
                        </button>
                      )}
                      <Badge className={fila.length === 0 ? "bg-primary text-primary-foreground" : ""} variant={fila.length ? "outline" : "default"}>
                        {fila.length === 0 ? "Livre" : `${fila.length} na fila`}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Usuário</span>
                      <Select value={b.usuario_id ?? "nenhum"} onValueChange={(v) => {
                        const u = operadores.find((o) => o.id === v);
                        salvarBancada(b, { usuario_id: v === "nenhum" ? null : v, ...(u ? { tecnico_nome: u.nome } : {}) }, "Responsável atualizado");
                      }}>
                        <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Não vinculado {b.tecnico_nome ? `(${b.tecnico_nome})` : ""}</SelectItem>
                          {operadores.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {!b.usuario_id && b.tecnico_nome && <p className="text-[10px] text-muted-foreground">Responsável: {b.tecnico_nome} (sem usuário no app)</p>}
                  </CardHeader>
                  <CardContent className="space-y-2 p-2">
                    {fila.length === 0 && <p className="p-2 text-xs text-muted-foreground">Sem serviço. Destine algo da aba "Sem destino".</p>}
                    {fila.map((s, i) => <CardServico key={s.id} s={s} i={i} fila={fila} />)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Torneiro */}
        <TabsContent value="torno" className="space-y-3">
          {usinagem.length === 0 && <Vazio texto="Nenhuma bancada marcada como usinagem." />}
          {usinagem.map((b) => {
            const fila = filaDa(b);
            return (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between border-b p-3">
                  <CardTitle className="text-sm font-black uppercase">{b.nome} · {nomeBancada(b)}</CardTitle>
                  <Link to="/engenharia/materiais"><Button size="sm" variant="outline" className="gap-1"><Calculator className="h-4 w-4" /> Calcular matéria-prima</Button></Link>
                </CardHeader>
                <CardContent className="p-0">
                  {fila.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma peça para produzir.</p>}
                  <div className="divide-y">
                    {fila.map((s, i) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                        <span className="w-6 font-black text-primary">#{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold">{s.componente} {s.quantidade > 1 && <span className="font-normal">× {s.quantidade}</span>}</div>
                          <div className="text-xs text-muted-foreground">{s.descricao}</div>
                          <LinhaOs s={s} />
                        </div>
                        <Badge className={`text-[9px] uppercase ${corStatus[s.status]}`}>{STATUS_SUB[s.status as StatusSub]}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => mover(fila, i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === fila.length - 1} onClick={() => mover(fila, i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                        {s.status !== "em_andamento"
                          ? <Button size="sm" className="gap-1" onClick={() => iniciar(s)}><Play className="h-3 w-3" /> Iniciar</Button>
                          : <Button size="sm" variant="outline" className="gap-1" onClick={() => { setPausa(s); setMotivo(""); }}><Pause className="h-3 w-3" /> Pausar</Button>}
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => concluir(s)}><CheckCircle2 className="h-3 w-3" /> Peça pronta</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {sugeridasTorno.length > 0 && usinagem[0] && (
            <Card className="border-primary">
              <CardHeader className="border-b p-3"><CardTitle className="text-sm font-black uppercase">Prováveis peças de usinagem ainda sem destino</CardTitle></CardHeader>
              <CardContent className="divide-y p-0">
                {sugeridasTorno.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1"><LinhaOs s={s} /><div className="font-bold">{s.componente} <span className="font-normal text-muted-foreground">— {s.descricao}</span></div></div>
                    <Button size="sm" className="gap-1" onClick={() => abrirDestino(s, "interno", usinagem[0].id)}><Cog className="h-4 w-4" /> Mandar ao torno</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Terceiros */}
        <TabsContent value="terceiros" className="space-y-2">
          {externos.length === 0 && <Vazio texto="Nada com terceiros no momento." />}
          {[...externos].sort((a, b) => String(a.prazo_retorno ?? "9").localeCompare(String(b.prazo_retorno ?? "9"))).map((s) => {
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

        {/* Sem destino */}
        <TabsContent value="fila" className="space-y-2">
          {semDestino.length === 0 && <Vazio texto="Nenhum serviço aguardando destino." />}
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

        {/* Fluxo */}
        <TabsContent value="fluxo">
          <p className="mb-2 text-xs text-muted-foreground">Chegou → lavar → abrir → guardar peças → (aprovação da diretoria) → enviar a terceiros e comprar vedações → custos → orçamento ao cliente → terminar serviço → receber terceiros → fazer peças novas → montar → pintar → entregar.</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {etapas.map((e) => {
              const lista = chegadas.filter((o) => e.fases.includes(faseDoStatus(o.status, o.status_financeiro)));
              return (
                <Card key={e.titulo} className="w-64 shrink-0">
                  <CardHeader className="border-b p-3">
                    <CardTitle className="flex items-center justify-between text-xs font-black uppercase">{e.titulo}<Badge variant="outline">{lista.length}</Badge></CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 p-2">
                    {lista.length === 0 && <p className="p-2 text-xs text-muted-foreground">—</p>}
                    {lista.map((o) => {
                      const so = subs.filter((s) => s.os_id === o.id && s.status !== "concluido");
                      const fora = so.filter((s) => s.destino === "terceiro").length;
                      return (
                        <Link key={o.id} to="/os/$id" params={{ id: o.id }} className="block rounded-md border border-border p-2 hover:border-primary">
                          <div className="text-xs font-black">OS {o.numero_os}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{o.cliente}</div>
                          {so.length > 0 && <div className="mt-1 text-[10px]">{so.length} serviço(s) abertos{fora ? ` · ${fora} com terceiro` : ""}</div>}
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
                <Label>Bancada</Label>
                <Select value={formDest.bancada_id} onValueChange={(v) => setFormDest({ ...formDest, bancada_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {bancadas.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.nome} · {nomeBancada(b)} ({filaDa(b).length} na fila)</SelectItem>
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
