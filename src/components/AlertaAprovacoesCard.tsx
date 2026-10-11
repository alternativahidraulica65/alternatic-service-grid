import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Check, X, Users, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [aba, setAba] = useState<"clientes" | "fornecedores">("clientes");
  const [reprovando, setReprovando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alerta_aprovacoes"],
    queryFn: async () => {
      const [c, f] = await Promise.all([
        supabase.from("clientes").select("id, nome, cnpj, telefone, criado_em").eq("status_cadastro", "pendente").order("criado_em", { ascending: true }),
        supabase.from("fornecedores").select("id, nome, cnpj, telefone, contato, tipo_parceiro, criado_em").eq("status_cadastro", "pendente").order("criado_em", { ascending: true }),
      ]);
      if (c.error) throw c.error;
      if (f.error) throw f.error;
      return {
        clientes: (c.data ?? []).map((x) => ({ ...x, tabela: "clientes" as const })),
        fornecedores: (f.data ?? []).map((x) => ({ ...x, tabela: "fornecedores" as const })),
      };
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const clientes = data?.clientes ?? [];
  const fornecedores = data?.fornecedores ?? [];
  const total = clientes.length + fornecedores.length;

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

  const abrir = () => { setAba(clientes.length || !fornecedores.length ? "clientes" : "fornecedores"); setAberto(true); };
  const lista: Pendente[] = aba === "clientes" ? clientes : fornecedores;

  return (
    <>
      <Card role="button" tabIndex={0} onClick={abrir}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") abrir(); }}
        aria-label={`Cadastros aguardando aprovação: ${total}`}
        className={`cursor-pointer border-l-8 shadow-md transition-transform hover:-translate-y-0.5 ${total > 0 ? "border-l-amber-500 bg-amber-50/70 border-amber-200" : "border-l-emerald-500 bg-emerald-50/60 border-emerald-200"}`}>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${total > 0 ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
              {total > 0 ? <ShieldAlert className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aprovações de cadastro</p>
              <p className="text-2xl font-black text-slate-900">
                {isLoading ? "…" : total > 0 ? `${total} aguardando aprovação` : "Nenhum cadastro pendente"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-white"><Users className="h-3 w-3 mr-1" />{clientes.length} cliente(s)</Badge>
            <Badge variant="outline" className="bg-white"><Truck className="h-3 w-3 mr-1" />{fornecedores.length} fornecedor(es)/terceiro(s)</Badge>
          </div>
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase font-black">Cadastros aguardando aprovação</DialogTitle>
            <DialogDescription>Aprove para liberar o uso em OS, orçamentos e custos. Reprovação exige motivo.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button size="sm" variant={aba === "clientes" ? "default" : "outline"} onClick={() => setAba("clientes")}>Clientes ({clientes.length})</Button>
            <Button size="sm" variant={aba === "fornecedores" ? "default" : "outline"} onClick={() => setAba("fornecedores")}>Fornecedores e terceiros ({fornecedores.length})</Button>
          </div>
          {lista.length === 0 ? (
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
