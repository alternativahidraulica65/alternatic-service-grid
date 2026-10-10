import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Search, AlertTriangle, HeartPulse, HardHat, Hourglass, Palmtree,
  Paperclip, Download, Trash2, UserRound, IdCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/rh/colaboradores")({
  beforeLoad: ({ context }) => {
    const roles = ((context as any).roles || []) as string[];
    // Exclusivo do Financeiro: nem Diretor acessa.
    if (!roles.includes("administrativo_financeiro")) {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Colaboradores | Alternativa Hidráulica" },
      { name: "description", content: "Cadastro de colaboradores, ASO, NRs, experiência e férias." },
      { property: "og:title", content: "Colaboradores | Alternativa Hidráulica" },
      { property: "og:description", content: "Gestão de pessoal e alertas de vencimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ColaboradoresPage,
});

type Colab = Record<string, any>;
type Janela = "vencidos" | "30" | "60";
type Alerta = { colabId: string; nome: string; tipo: "ASO" | "NR" | "Experiência" | "Férias"; rotulo: string; data: string; dias: number };

const STATUS = ["ativo", "experiencia", "ferias", "afastado", "desligado"];
const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", experiencia: "Experiência", ferias: "Férias", afastado: "Afastado", desligado: "Desligado" };
const CATEGORIAS = ["ASO", "Certificado", "Contrato", "Documento pessoal", "Outros"];
const NORMAS = ["NR-35", "NR-10", "NR-12", "NR-11", "NR-33", "NR-06", "Outra"];

const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const diasAte = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - hoje().getTime()) / 86400000);
const fmt = (iso?: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—");
const addDias = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const mascaraCpf = (c?: string | null) => { const s = (c || "").replace(/\D/g, ""); return s.length === 11 ? `***.${s.slice(3, 6)}.${s.slice(6, 9)}-**` : "—"; };

function useDados() {
  return useQuery({
    queryKey: ["rh-colaboradores"],
    queryFn: async () => {
      const [c, a, n, f] = await Promise.all([
        supabase.from("colaboradores").select("*").order("nome"),
        supabase.from("colaborador_aso").select("*").order("data_exame", { ascending: false }),
        supabase.from("colaborador_certificacoes").select("*").order("emissao", { ascending: false }),
        supabase.from("colaborador_ferias").select("*").order("inicio", { ascending: false }),
      ]);
      const err = c.error || a.error || n.error || f.error;
      if (err) throw err;
      return { colabs: (c.data || []) as Colab[], aso: a.data || [], nrs: n.data || [], ferias: f.data || [] };
    },
  });
}

function calcularAlertas(d: ReturnType<typeof useDados>["data"]): Alerta[] {
  if (!d) return [];
  const out: Alerta[] = [];
  const ativos = d.colabs.filter((c) => c.ativo && c.status !== "desligado");
  for (const c of ativos) {
    const aso = d.aso.find((x: any) => x.colaborador_id === c.id && x.validade);
    if (aso) out.push({ colabId: c.id, nome: c.nome, tipo: "ASO", rotulo: `ASO ${aso.tipo}`, data: aso.validade, dias: diasAte(aso.validade) });
    const vistos = new Set<string>();
    for (const n of d.nrs.filter((x: any) => x.colaborador_id === c.id && x.validade)) {
      if (vistos.has(n.norma)) continue;
      vistos.add(n.norma);
      out.push({ colabId: c.id, nome: c.nome, tipo: "NR", rotulo: `Reciclagem ${n.norma}`, data: n.validade, dias: diasAte(n.validade) });
    }
    if (c.data_admissao && c.dias_experiencia) {
      const fim = addDias(c.data_admissao, c.dias_experiencia);
      const dd = diasAte(fim);
      if (dd >= -30) out.push({ colabId: c.id, nome: c.nome, tipo: "Experiência", rotulo: `Fim da experiência (${c.dias_experiencia} dias)`, data: fim, dias: dd });
    }
    for (const fe of d.ferias.filter((x: any) => x.colaborador_id === c.id)) {
      const di = diasAte(fe.inicio), df = diasAte(fe.fim);
      if (di >= 0) out.push({ colabId: c.id, nome: c.nome, tipo: "Férias", rotulo: "Início de férias", data: fe.inicio, dias: di });
      else if (df >= 0) out.push({ colabId: c.id, nome: c.nome, tipo: "Férias", rotulo: "Término de férias", data: fe.fim, dias: df });
    }
  }
  return out.sort((a, b) => a.dias - b.dias);
}

const noFiltro = (a: Alerta, j: Janela) => (j === "vencidos" ? a.dias < 0 : j === "30" ? a.dias >= 0 && a.dias <= 30 : a.dias >= 0 && a.dias <= 60);
const corAlerta = (dias: number) => (dias < 0 ? "border-destructive/50 bg-destructive/10 text-destructive" : dias <= 30 ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-muted text-muted-foreground");

function ColaboradoresPage() {
  const { data, isLoading, error } = useDados();
  const [janela, setJanela] = useState<Janela>("30");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [setor, setSetor] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  const alertas = useMemo(() => calcularAlertas(data), [data]);
  const filtrados = alertas.filter((a) => noFiltro(a, janela));
  const pendentesPorColab = useMemo(() => new Set(alertas.filter((a) => a.dias <= 30 && a.tipo !== "Férias").map((a) => a.colabId)), [alertas]);
  const setores = useMemo(() => Array.from(new Set((data?.colabs || []).map((c) => c.setor).filter(Boolean))), [data]);

  const lista = (data?.colabs || []).filter((c) => {
    const q = busca.toLowerCase().trim();
    const okQ = !q || c.nome?.toLowerCase().includes(q) || (c.cpf || "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§");
    return okQ && (!filtroStatus || c.status === filtroStatus) && (!setor || c.setor === setor);
  });

  const tipos: { t: Alerta["tipo"]; label: string; icon: any }[] = [
    { t: "ASO", label: "ASO", icon: HeartPulse },
    { t: "NR", label: "NRs / Certificações", icon: HardHat },
    { t: "Experiência", label: "Fim de experiência", icon: Hourglass },
    { t: "Férias", label: "Férias", icon: Palmtree },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link></Button>
          <div className="flex-1">
            <h1 className="text-xl font-black uppercase tracking-tight">Colaboradores</h1>
            <p className="text-xs text-muted-foreground">Administração de pessoal — acesso exclusivo do Financeiro</p>
          </div>
          <Button onClick={() => setNovo(true)}><Plus className="h-4 w-4 mr-1" />Novo colaborador</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {error && <div className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">Erro ao carregar: {(error as any).message}</div>}

        <section className="rounded-md border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <h2 className="font-bold uppercase text-sm tracking-wide flex-1">Avisos e vencimentos próximos</h2>
            {([["vencidos", "Vencidos"], ["30", "Até 30 dias"], ["60", "Até 60 dias"]] as [Janela, string][]).map(([k, l]) => (
              <Button key={k} size="sm" variant={janela === k ? "default" : "outline"} onClick={() => setJanela(k)}>
                {l} ({alertas.filter((a) => noFiltro(a, k)).length})
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tipos.map(({ t, label, icon: Icon }) => {
              const n = filtrados.filter((a) => a.tipo === t).length;
              return (
                <div key={t} className={`rounded-md border p-3 ${n ? (janela === "vencidos" ? "border-destructive/50 bg-destructive/10" : "border-primary/60 bg-primary/10") : ""}`}>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Icon className="h-4 w-4" />{label}</div>
                  <div className="text-3xl font-black mt-1">{n}</div>
                </div>
              );
            })}
          </div>
          {filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência nesse período.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto">
              {filtrados.map((a, i) => (
                <button key={i} onClick={() => setAbertoId(a.colabId)} className={`w-full text-left rounded-md border px-3 py-2 flex flex-wrap items-center gap-2 text-sm ${corAlerta(a.dias)}`}>
                  <span className="font-bold">{a.nome}</span>
                  <span className="opacity-80">· {a.rotulo}</span>
                  <span className="ml-auto font-mono text-xs">{fmt(a.data)} · {a.dias < 0 ? `vencido há ${-a.dias} dia(s)` : a.dias === 0 ? "hoje" : `em ${a.dias} dia(s)`}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome ou CPF" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Todos os setores</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lista.map((c) => <CardRG key={c.id} c={c} pendente={pendentesPorColab.has(c.id)} onClick={() => setAbertoId(c.id)} />)}
            </div>
          )}
        </section>
      </main>

      {novo && <FichaDialog id={null} onClose={() => setNovo(false)} onCriado={(id) => { setNovo(false); setAbertoId(id); }} />}
      {abertoId && <FichaDialog id={abertoId} onClose={() => setAbertoId(null)} />}
    </div>
  );
}

function useFoto(path?: string | null) {
  return useQuery({
    queryKey: ["rh-foto", path],
    enabled: !!path,
    queryFn: async () => (await supabase.storage.from("colaboradores-docs").createSignedUrl(path!, 3600)).data?.signedUrl || null,
  });
}

function CardRG({ c, pendente, onClick }: { c: Colab; pendente: boolean; onClick: () => void }) {
  const { data: foto } = useFoto(c.foto_path);
  return (
    <button onClick={onClick} className={`text-left rounded-md border bg-card overflow-hidden hover:border-primary transition-colors ${!c.ativo ? "opacity-60" : ""}`}>
      <div className="bg-foreground text-background px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
        <IdCard className="h-3.5 w-3.5 text-primary" /> Alternativa Hidráulica · Identificação
        {pendente && <span className="ml-auto rounded-sm bg-primary text-primary-foreground px-1.5">Pendência</span>}
      </div>
      <div className="p-3 flex gap-3">
        <div className="h-24 w-20 shrink-0 rounded-sm border bg-muted flex items-center justify-center overflow-hidden">
          {foto ? <img src={foto} alt={c.nome} className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10 text-muted-foreground" />}
        </div>
        <div className="min-w-0 text-xs space-y-1">
          <div className="font-black text-sm uppercase truncate">{c.nome}</div>
          <div className="text-muted-foreground truncate">{c.cargo || "—"}{c.setor ? ` · ${c.setor}` : ""}</div>
          <div><span className="text-muted-foreground">Matrícula:</span> <span className="font-mono">{c.matricula || "—"}</span></div>
          <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{mascaraCpf(c.cpf)}</span></div>
          <div><span className="text-muted-foreground">Admissão:</span> {fmt(c.data_admissao)}</div>
          <span className="inline-block rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase">{STATUS_LABEL[c.status] || c.status}</span>
        </div>
      </div>
    </button>
  );
}

const CAMPOS_PESSOAIS: [string, string, string?][] = [
  ["nome", "Nome completo"], ["cpf", "CPF"], ["rg", "RG"], ["data_nascimento", "Nascimento", "date"],
  ["telefone", "Telefone"], ["email", "E-mail"], ["endereco", "Endereço"],
];
const CAMPOS_CONTRATO: [string, string, string?][] = [
  ["matricula", "Matrícula"], ["cargo", "Cargo / Função"], ["setor", "Setor"], ["data_admissao", "Admissão", "date"],
  ["salario", "Salário (R$)", "number"], ["tipo_contrato", "Tipo de contrato"], ["dias_experiencia", "Período de experiência (dias)", "number"],
];

function FichaDialog({ id, onClose, onCriado }: { id: string | null; onClose: () => void; onCriado?: (id: string) => void }) {
  const qc = useQueryClient();
  const { data } = useDados();
  const existente = id ? data?.colabs.find((c) => c.id === id) : null;
  const [form, setForm] = useState<Colab>(() => existente || { status: "experiencia", tipo_contrato: "CLT", dias_experiencia: 90, ativo: true });
  const [salvando, setSalvando] = useState(false);
  const { data: foto } = useFoto(existente?.foto_path);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["rh-colaboradores"] });

  async function salvar() {
    if (!form.nome?.trim()) return toast.error("Informe o nome.");
    const cpf = (form.cpf || "").replace(/\D/g, "");
    if (cpf && cpf.length !== 11) return toast.error("CPF deve ter 11 dígitos.");
    setSalvando(true);
    const payload: Colab = {};
    for (const [k, , t] of [...CAMPOS_PESSOAIS, ...CAMPOS_CONTRATO]) {
      const v = form[k];
      payload[k] = v === "" || v === undefined ? null : t === "number" ? Number(v) : v;
    }
    payload.cpf = cpf || null;
    payload.status = form.status;
    payload.observacoes = form.observacoes || null;
    const { data: u } = await supabase.auth.getUser();
    const res = id
      ? await supabase.from("colaboradores").update(payload).eq("id", id).select("id").single()
      : await supabase.from("colaboradores").insert({ ...payload, criado_por: u.user?.id }).select("id").single();
    setSalvando(false);
    if (res.error) return toast.error(res.error.code === "23505" ? "CPF já cadastrado." : `Erro ao salvar: ${res.error.message}`);
    toast.success("Colaborador salvo.");
    await recarregar();
    if (!id && res.data) onCriado?.(res.data.id);
  }

  async function alternarAtivo() {
    if (!id) return;
    const ativo = !existente?.ativo;
    const { error } = await supabase.from("colaboradores").update({ ativo, status: ativo ? "ativo" : "desligado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(ativo ? "Colaborador reativado." : "Colaborador inativado.");
    setForm((f) => ({ ...f, ativo, status: ativo ? "ativo" : "desligado" }));
    recarregar();
  }

  async function enviarFoto(file: File) {
    if (!id) return;
    const path = `${id}/foto-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from("colaboradores-docs").upload(path, file);
    if (up.error) return toast.error(up.error.message);
    const { error } = await supabase.from("colaboradores").update({ foto_path: path }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Foto atualizada.");
    recarregar();
  }

  const campo = ([k, l, t]: [string, string, string?]) => (
    <div key={k} className="space-y-1">
      <Label className="text-xs">{l}</Label>
      <Input type={t || "text"} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  const fimExp = form.data_admissao && form.dias_experiencia ? addDias(form.data_admissao, Number(form.dias_experiencia)) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {id && (
              <label className="h-16 w-14 rounded-sm border bg-muted flex items-center justify-center overflow-hidden cursor-pointer" title="Trocar foto">
                {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7 text-muted-foreground" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && enviarFoto(e.target.files[0])} />
              </label>
            )}
            <span>{id ? existente?.nome : "Novo colaborador"}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pessoais">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="pessoais">Dados pessoais</TabsTrigger>
            <TabsTrigger value="contrato">Contrato</TabsTrigger>
            {id && <TabsTrigger value="aso">ASO</TabsTrigger>}
            {id && <TabsTrigger value="nrs">NRs</TabsTrigger>}
            {id && <TabsTrigger value="ferias">Férias</TabsTrigger>}
            {id && <TabsTrigger value="anexos">Anexos</TabsTrigger>}
          </TabsList>

          <TabsContent value="pessoais" className="grid sm:grid-cols-2 gap-3 pt-3">
            {CAMPOS_PESSOAIS.map(campo)}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Observações</Label>
              <Input value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </TabsContent>

          <TabsContent value="contrato" className="grid sm:grid-cols-2 gap-3 pt-3">
            {CAMPOS_CONTRATO.map(campo)}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 text-xs text-muted-foreground">Fim do período de experiência: <b>{fmt(fimExp)}</b></div>
          </TabsContent>

          {id && <TabsContent value="aso" className="pt-3"><SubLista colabId={id} tabela="colaborador_aso" registros={data?.aso || []} campos={[["tipo", "Tipo", "select:Admissional,Periódico,Retorno ao trabalho,Mudança de função,Demissional"], ["data_exame", "Data do exame", "date"], ["validade", "Validade", "date"], ["observacao", "Observação"]]} /></TabsContent>}
          {id && <TabsContent value="nrs" className="pt-3"><SubLista colabId={id} tabela="colaborador_certificacoes" registros={data?.nrs || []} campos={[["norma", "Norma", `select:${NORMAS.join(",")}`], ["descricao", "Descrição"], ["emissao", "Emissão", "date"], ["validade", "Validade", "date"]]} /></TabsContent>}
          {id && <TabsContent value="ferias" className="pt-3"><SubLista colabId={id} tabela="colaborador_ferias" registros={data?.ferias || []} campos={[["inicio", "Início", "date"], ["fim", "Término", "date"], ["observacao", "Observação"]]} /></TabsContent>}
          {id && <TabsContent value="anexos" className="pt-3"><Anexos colabId={id} /></TabsContent>}
        </Tabs>

        <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
          {id && <Button variant="outline" onClick={alternarAtivo}>{existente?.ativo ? "Inativar" : "Reativar"}</Button>}
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar dados"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubLista({ colabId, tabela, registros, campos }: { colabId: string; tabela: string; registros: any[]; campos: [string, string, string?][] }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState<Colab>({});
  const itens = registros.filter((r) => r.colaborador_id === colabId);
  const obrigatorios = campos.filter(([, , t]) => t === "date").slice(0, 1).map(([k]) => k).concat(campos.filter(([, , t]) => t?.startsWith("select")).map(([k]) => k));

  async function adicionar() {
    const faltando = obrigatorios.filter((k) => !novo[k] && !(campos.find((c) => c[0] === k)?.[2]?.startsWith("select")));
    if (faltando.length) return toast.error("Preencha as datas obrigatórias.");
    const payload: Colab = { colaborador_id: colabId };
    for (const [k, , t] of campos) payload[k] = novo[k] || (t?.startsWith("select") ? t.slice(7).split(",")[0] : null);
    const { error } = await supabase.from(tabela).insert(payload);
    if (error) return toast.error(`Erro: ${error.message}`);
    toast.success("Registro adicionado.");
    setNovo({});
    qc.invalidateQueries({ queryKey: ["rh-colaboradores"] });
  }
  async function remover(rid: string) {
    if (!confirm("Remover este registro?")) return;
    const { error } = await supabase.from(tabela).delete().eq("id", rid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["rh-colaboradores"] });
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-4 gap-2 items-end rounded-md border p-3">
        {campos.map(([k, l, t]) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs">{l}</Label>
            {t?.startsWith("select:") ? (
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={novo[k] ?? ""} onChange={(e) => setNovo({ ...novo, [k]: e.target.value })}>
                {t.slice(7).split(",").map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <Input type={t || "text"} value={novo[k] ?? ""} onChange={(e) => setNovo({ ...novo, [k]: e.target.value })} />
            )}
          </div>
        ))}
        <Button onClick={adicionar} className="sm:col-span-4"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      {itens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro.</p> : itens.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
          {campos.map(([k, l, t]) => (
            <span key={k}><span className="text-muted-foreground text-xs">{l}:</span> {t === "date" ? fmt(r[k]) : r[k] || "—"}</span>
          ))}
          {r.validade && <span className={`rounded-sm border px-1.5 text-xs font-bold ${corAlerta(diasAte(r.validade))}`}>{diasAte(r.validade) < 0 ? "Vencido" : `${diasAte(r.validade)} dias`}</span>}
          <Button size="icon" variant="ghost" className="ml-auto" onClick={() => remover(r.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}

function Anexos({ colabId }: { colabId: string }) {
  const qc = useQueryClient();
  const [categoria, setCategoria] = useState("Outros");
  const [enviando, setEnviando] = useState(false);
  const { data: anexos = [] } = useQuery({
    queryKey: ["rh-anexos", colabId],
    queryFn: async () => {
      const { data, error } = await supabase.from("colaborador_anexos").select("*").eq("colaborador_id", colabId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  async function enviar(files: FileList) {
    setEnviando(true);
    const { data: u } = await supabase.auth.getUser();
    for (const file of Array.from(files)) {
      const path = `${colabId}/anexos/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("colaboradores-docs").upload(path, file);
      if (up.error) { toast.error(`${file.name}: ${up.error.message}`); continue; }
      const { error } = await supabase.from("colaborador_anexos").insert({ colaborador_id: colabId, categoria, nome: file.name, storage_path: path, tamanho: file.size, criado_por: u.user?.id });
      if (error) toast.error(error.message);
    }
    setEnviando(false);
    toast.success("Anexos enviados.");
    qc.invalidateQueries({ queryKey: ["rh-anexos", colabId] });
  }
  async function baixar(path: string) {
    const { data, error } = await supabase.storage.from("colaboradores-docs").createSignedUrl(path, 300);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo.");
    window.open(data.signedUrl, "_blank");
  }
  async function remover(a: any) {
    if (!confirm(`Remover ${a.nome}?`)) return;
    await supabase.storage.from("colaboradores-docs").remove([a.storage_path]);
    const { error } = await supabase.from("colaborador_anexos").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["rh-anexos", colabId] });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center rounded-md border p-3">
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold cursor-pointer">
          <Paperclip className="h-4 w-4" />{enviando ? "Enviando..." : "Adicionar arquivos"}
          <input type="file" multiple className="hidden" disabled={enviando} onChange={(e) => e.target.files?.length && enviar(e.target.files)} />
        </label>
      </div>
      {anexos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum anexo.</p> : anexos.map((a: any) => (
        <div key={a.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
          <span className="rounded-sm border px-1.5 text-[10px] font-bold uppercase">{a.categoria}</span>
          <span className="truncate flex-1">{a.nome}</span>
          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
          <Button size="icon" variant="ghost" onClick={() => baixar(a.storage_path)}><Download className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => remover(a)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}
