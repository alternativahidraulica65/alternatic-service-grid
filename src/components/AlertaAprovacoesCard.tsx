import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Check, X, Users, Truck, Wrench, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getExecutorEmail } from "@/lib/log-executor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ServicoPendente = {
  id: string;
  numero_os: string;
  cliente: string;
  status: string;
  valor_final: number | null;
  valor_total: number | null;
  orcamento_enviado_em: string | null;
  orcamento_resposta: string | null;
  data_abertura: string | null;
};

const brl = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Pendente = {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  contato?: string | null;
  tipo_parceiro?: string | null;
  criado_em: string | null;
  tabela: "clientes" | "fornecedores";
};

const TIPO: Record<string, string> = { material: "Material", servico: "Serviço", ambos: "Material e serviço" };

export function AlertaAprovacoesCard() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"servicos" | "clientes" | "fornecedores">("servicos");
  const [reprovando, setReprovando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alerta_aprovacoes"],
    queryFn: async () => {
      const [c, f, o] = await Promise.all([
        supabase.from("clientes").select("id, nome, cnpj, telefone, criado_em").ilike("status_cadastro", "provisório").order("criado_em", { ascending: true }),
        supabase.from("fornecedores").select("id, nome, cnpj, telefone, contato, tipo_parceiro, criado_em").ilike("status_cadastro", "provisório").order("criado_em", { ascending: true }),
        supabase.from("ordens_servico").select("*").in("status", ["orcamento_pendente", "orcamento", "aguardando_aprovacao"]).order("data_abertura", { ascending: true }),
      ]);
      if (o.error) throw o.error;
      if (c.error) throw c.error;
      if (f.error) throw f.error;
      return {
        clientes: (c.data ?? []).map((x) => ({ ...x, tabela: "clientes" as const })),
        fornecedores: (f.data ?? []).map((x) => ({ ...x, tabela: "fornecedores" as const })),
        servicos: ((o.data ?? []) as any[]).filter(
          (x) => !["aprovado", "recusado"].includes(String(x.orcamento_resposta || "").toLowerCase()),
        ) as ServicoPendente[],
      };
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const clientes = data?.clientes ?? [];
  const fornecedores = data?.fornecedores ?? [];
  const servicos = data?.servicos ?? [];
  const totalCadastros = clientes.length + fornecedores.length;
  const total = totalCadastros + servicos.length;

  const decidirServico = async (os: ServicoPendente, aprovado: boolean) => {
    if (!aprovado && !motivo.trim()) { toast.error("Informe o motivo da recusa."); return; }
    setOcupado(os.id);
    try {
      const payload: Record<string, unknown> = {
        orcamento_resposta: aprovado ? "aprovado" : "recusado",
        orcamento_resposta_em: new Date().toISOString(),
        orcamento_resposta_motivo: aprovado ? (motivo.trim() || null) : motivo.trim(),
        status_financeiro: aprovado ? "Aprovado" : "Recusado",
      };
      if (aprovado) payload["status"] = "aprovada";
      const { data: upd, error } = await supabase.from("ordens_servico").update(payload as never).eq("id", os.id).select("id");
      if (error) throw error;
      if (!upd?.length) throw new Error("Sem permissão para alterar esta OS.");
      await supabase.from("historico_status_os" as any).insert({
        os_id: os.id,
        status_anterior: os.status,
        status_novo: aprovado ? "aprovada" : os.status,
        observacao: `Resposta do cliente (painel de aprovações): ${aprovado ? "Aprovado" : "Recusado"}${motivo.trim() ? ` — ${motivo.trim()}` : ""}`,
        executor_email: await getExecutorEmail(),
      });
      toast.success(`${os.numero_os}: serviço ${aprovado ? "aprovado" : "recusado"}.`);
      setReprovando(null); setMotivo("");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error("Não foi possível registrar: " + (e?.message || e));
    } finally { setOcupado(null); }
  };

  const decidir = async (item: Pendente, aprovado: boolean) => {
    if (!aprovado && !motivo.trim()) { toast.error("Informe o motivo da reprovação."); return; }
    setOcupado(item.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload: Record<string, unknown> = {
        status_cadastro: aprovado ? "aprovado" : "reprovado",
        aprovado_por: u.user?.id ?? null,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: aprovado ? null : motivo.trim(),
      };
      if (item.tabela === "fornecedores") payload["ativo"] = aprovado;
      const { data: upd, error } = await supabase.from(item.tabela).update(payload as never).eq("id", item.id).select("id");
      if (error) throw error;
      if (!upd?.length) throw new Error("Sem permissão para alterar este cadastro.");
      toast.success(`${item.nome}: ${aprovado ? "aprovado" : "reprovado"}.`);
      setReprovando(null); setMotivo("");
      ["alerta_aprovacoes", "clientes_list", "clientes_lookup", "fornecedores_custos", "fornecedores"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }));
    } catch (e: any) {
      toast.error("Não foi possível registrar: " + (e?.message || e));
    } finally { setOcupado(null); }
  };

  const abrir = () => {
    setAba(servicos.length ? "servicos" : clientes.length ? "clientes" : fornecedores.length ? "fornecedores" : "servicos");
    setAberto(true);
  };
  const lista: Pendente[] = aba === "clientes" ? clientes : aba === "fornecedores" ? fornecedores : [];

  return (
    <>
      <Card role="button" tabIndex={0} onClick={abrir}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") abrir(); }}
        aria-label={`Itens aguardando aprovação: ${total}`}
        className={`cursor-pointer border-l-8 shadow-md transition-transform hover:-translate-y-0.5 ${total > 0 ? "border-l-amber-500 bg-amber-50/70 border-amber-200" : "border-l-emerald-500 bg-emerald-50/60 border-emerald-200"}`}>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${total > 0 ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
              {total > 0 ? <ShieldAlert className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aprovações · serviços e cadastros</p>
              <p className="text-2xl font-black text-slate-900">
                {isLoading ? "…" : total > 0 ? `${total} aguardando aprovação` : "Nada pendente de aprovação"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white"><Wrench className="h-3 w-3 mr-1" />{servicos.length} serviço(s)</Badge>
            <Badge variant="outline" className="bg-white"><Users className="h-3 w-3 mr-1" />{clientes.length} cliente(s)</Badge>
            <Badge variant="outline" className="bg-white"><Truck className="h-3 w-3 mr-1" />{fornecedores.length} fornecedor(es)/terceiro(s)</Badge>
          </div>
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase font-black">Aguardando aprovação</DialogTitle>
            <DialogDescription>Serviços: registre a resposta do cliente ao orçamento. Cadastros: aprove para liberar o uso em OS, orçamentos e custos. Recusa exige motivo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={aba === "servicos" ? "default" : "outline"} onClick={() => setAba("servicos")}>Serviços ({servicos.length})</Button>
            <Button size="sm" variant={aba === "clientes" ? "default" : "outline"} onClick={() => setAba("clientes")}>Clientes ({clientes.length})</Button>
            <Button size="sm" variant={aba === "fornecedores" ? "default" : "outline"} onClick={() => setAba("fornecedores")}>Fornecedores e terceiros ({fornecedores.length})</Button>
          </div>
          {aba === "servicos" ? (
            servicos.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum serviço aguardando aprovação do cliente.</p>
            ) : (
              <div className="space-y-2">
                {servicos.map((os) => (
                  <div key={os.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{os.numero_os} · {os.cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          Valor: <span className="font-bold text-foreground">{brl(os.valor_final ?? os.valor_total)}</span>
                          {" · "}{os.orcamento_enviado_em ? `Enviado em ${new Date(os.orcamento_enviado_em).toLocaleDateString("pt-BR")}` : "Orçamento ainda não enviado"}
                          {os.orcamento_resposta === "revisao" ? " · Cliente pediu revisão" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/os/$id/orcamento" params={{ id: os.id }}><ExternalLink className="h-4 w-4 mr-1" />Orçamento</Link>
                        </Button>
                        <Button size="sm" disabled={ocupado === os.id} onClick={() => decidirServico(os, true)}>
                          <Check className="h-4 w-4 mr-1" />Aprovado
                        </Button>
                        <Button size="sm" variant="outline" disabled={ocupado === os.id}
                          onClick={() => { setReprovando(reprovando === os.id ? null : os.id); setMotivo(""); }}>
                          <X className="h-4 w-4 mr-1" />Recusado
                        </Button>
                      </div>
                    </div>
                    {reprovando === os.id && (
                      <div className="flex gap-2">
                        <Input autoFocus placeholder="Motivo da recusa" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                        <Button size="sm" variant="destructive" disabled={ocupado === os.id} onClick={() => decidirServico(os, false)}>Confirmar</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum cadastro pendente nesta aba.</p>
          ) : (
            <div className="space-y-2">
              {lista.map((item) => (
                <div key={item.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {item.cnpj || "—"} · Tel: {item.telefone || item.contato || "—"}
                        {item.tipo_parceiro ? ` · ${TIPO[item.tipo_parceiro] ?? item.tipo_parceiro}` : ""}
                        {" · "}Solicitado em {item.criado_em ? new Date(item.criado_em).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={ocupado === item.id} onClick={() => decidir(item, true)}>
                        <Check className="h-4 w-4 mr-1" />Aprovar
                      </Button>
                      <Button size="sm" variant="outline" disabled={ocupado === item.id}
                        onClick={() => { setReprovando(reprovando === item.id ? null : item.id); setMotivo(""); }}>
                        <X className="h-4 w-4 mr-1" />Reprovar
                      </Button>
                    </div>
                  </div>
                  {reprovando === item.id && (
                    <div className="flex gap-2">
                      <Input autoFocus placeholder="Motivo da reprovação" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                      <Button size="sm" variant="destructive" disabled={ocupado === item.id} onClick={() => decidir(item, false)}>Confirmar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
