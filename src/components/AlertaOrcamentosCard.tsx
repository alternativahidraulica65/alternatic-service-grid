import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calculator, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getExecutorEmail } from "@/lib/log-executor";
import { toast } from "sonner";

type OsOrcamento = {
  id: string;
  numero_os: string | null;
  cliente: string | null;
  prazo_orcamento: string | null;
  valor_total: number | null;
  status_financeiro: string | null;
};

const AGUARDANDO = "Aguardando Aprovação";

const dataBR = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";

const brl = (v: number | null) =>
  `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function AlertaOrcamentosCard() {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"fazer" | "cliente">("fazer");
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["alerta_orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, numero_os, cliente, prazo_orcamento, valor_total, status_financeiro")
        .eq("status", "orcamento_pendente")
        .order("prazo_orcamento", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as OsOrcamento[];
    },
    refetchOnWindowFocus: true,
  });

  const { paraFazer, aguardandoCliente } = useMemo(() => {
    const aguardandoCliente = ordens.filter((o) => o.status_financeiro === AGUARDANDO);
    const paraFazer = ordens.filter((o) => o.status_financeiro !== AGUARDANDO);
    return { paraFazer, aguardandoCliente };
  }, [ordens]);

  const total = paraFazer.length + aguardandoCliente.length;

  const abrir = (alvo: "fazer" | "cliente") => {
    setAba(alvo);
    setAberto(true);
  };

  const registrarAprovacao = async (os: OsOrcamento) => {
    setConfirmando(os.id);
    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: "aprovada", status_financeiro: "Aprovado pelo cliente" } as any)
        .eq("id", os.id);
      if (error) throw error;

      const email = await getExecutorEmail();
      await supabase.from("historico_status_os").insert({
        os_id: os.id,
        status_anterior: "orcamento_pendente",
        status_novo: "aprovada",
        observacao: `Aprovação do cliente registrada — ${brl(os.valor_total)}`,
        executor_email: email,
      } as any);

      toast.success(`Aprovação registrada para a ${os.numero_os || "OS"}.`);
      queryClient.invalidateQueries({ queryKey: ["alerta_orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["os_detail", os.id] });
    } catch (e: any) {
      toast.error("Não foi possível registrar a aprovação: " + (e?.message || e));
    } finally {
      setConfirmando(null);
    }
  };

  const lista = aba === "fazer" ? paraFazer : aguardandoCliente;

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-label={`Orçamentos pendentes: ${total}`}
        onClick={() => abrir(paraFazer.length ? "fazer" : "cliente")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") abrir(paraFazer.length ? "fazer" : "cliente");
        }}
        className={`cursor-pointer border-l-8 shadow-md transition-transform hover:-translate-y-0.5 ${
          total > 0
            ? "border-l-amber-500 bg-amber-50/70 border-amber-200"
            : "border-l-emerald-500 bg-emerald-50/60 border-emerald-200"
        }`}
      >
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                  total > 0 ? "bg-amber-500 text-slate-900" : "bg-emerald-500 text-white"
                }`}
              >
                {total > 0 ? <AlertTriangle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Alerta de orçamentos
                </p>
                <p className="text-3xl font-black leading-tight text-slate-900">
                  {isLoading ? "…" : total}
                </p>
                <p className="text-[11px] font-bold text-slate-600">
                  {total > 0 ? "Pendências aguardando ação" : "Nenhuma pendência de orçamento"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  abrir("fazer");
                }}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-left transition-colors hover:bg-amber-100"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <Calculator className="h-3.5 w-3.5 text-amber-600" /> Para fazer
                </span>
                <span className="text-xl font-black text-slate-900">{paraFazer.length}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  abrir("cliente");
                }}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-left transition-colors hover:bg-amber-100"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-amber-600" /> Aguardando cliente
                </span>
                <span className="text-xl font-black text-slate-900">{aguardandoCliente.length}</span>
              </button>
              <ArrowRight className="hidden h-5 w-5 text-amber-600 sm:block" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-widest">
              Orçamentos pendentes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Acompanhe e tome ação nas ordens de serviço marcadas como pendentes de orçamento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={aba === "fazer" ? "default" : "outline"}
              className="h-8 text-[10px] font-black uppercase tracking-widest"
              onClick={() => setAba("fazer")}
            >
              Para fazer ({paraFazer.length})
            </Button>
            <Button
              size="sm"
              variant={aba === "cliente" ? "default" : "outline"}
              className="h-8 text-[10px] font-black uppercase tracking-widest"
              onClick={() => setAba("cliente")}
            >
              Aguardando cliente ({aguardandoCliente.length})
            </Button>
          </div>

          <div className="space-y-2">
            {lista.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Nenhuma OS nesta situação
              </p>
            )}

            {lista.map((os) => (
              <div
                key={os.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{os.numero_os || "OS"}</p>
                  <p className="truncate text-xs font-medium text-slate-500">{os.cliente || "Cliente não informado"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                      Prazo {dataBR(os.prazo_orcamento)}
                    </Badge>
                    {aba === "cliente" && (
                      <Badge className="border-none bg-amber-500 text-[9px] font-black uppercase tracking-widest text-slate-900">
                        {brl(os.valor_total)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {aba === "fazer" ? (
                    <Button
                      asChild
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setAberto(false)}
                    >
                      <Link to="/os/$id/orcamento" params={{ id: os.id }}>Fazer orçamento</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={confirmando === os.id}
                      className="h-8 bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700"
                      onClick={() => registrarAprovacao(os)}
                    >
                      {confirmando === os.id ? "Registrando..." : "Cliente aprovou"}
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => setAberto(false)}
                  >
                    <Link to="/os/$id" params={{ id: os.id }}>Abrir OS</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
