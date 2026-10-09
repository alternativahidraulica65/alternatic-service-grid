import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/financeiro/valinhos")({
  head: () => ({
    meta: [
      { title: "Vales a pagar por fornecedor — Alternativa Hidráulica" },
      { name: "description", content: "Resumo mensal dos vales pendentes por fornecedor e quitação consolidada." },
      { property: "og:title", content: "Vales a pagar por fornecedor" },
      { property: "og:description", content: "Totais mensais pendentes e quitação consolidada dos vales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValinhosPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ValinhosPage() {
  const { podeVerValoresFinanceiros } = useUserRole();
  const qc = useQueryClient();
  const hoje = new Date();
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [quitar, setQuitar] = useState<{ id: string; nome: string; total: number; ids: string[] } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { inicio, fim } = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    return { inicio: new Date(y!, m! - 1, 1).toISOString(), fim: new Date(y!, m!, 1).toISOString() };
  }, [mes]);

  const { data: custos = [], isLoading } = useQuery({
    queryKey: ["valinhos", mes],
    enabled: podeVerValoresFinanceiros,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos" as any)
        .select("id, descricao, custo_interno, fornecedor_id, terceiro_nome, criado_em, os_id")
        .eq("pago", false)
        .gt("custo_interno", 0)
        .gte("criado_em", inicio)
        .lt("criado_em", fim);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-nomes"],
    enabled: podeVerValoresFinanceiros,
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores" as any).select("id, nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const grupos = useMemo(() => {
    const nomes = new Map(fornecedores.map((f: any) => [f.id, f.nome]));
    const map = new Map<string, { id: string; nome: string; total: number; ids: string[]; itens: any[] }>();
    for (const c of custos) {
      const id = c.fornecedor_id ?? "__sem";
      const nome = (nomes.get(c.fornecedor_id) as string) ?? c.terceiro_nome ?? "Sem fornecedor";
      const g = map.get(id) ?? { id, nome, total: 0, ids: [], itens: [] };
      g.total += Number(c.custo_interno ?? 0);
      g.ids.push(c.id);
      g.itens.push(c);
      map.set(id, g);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [custos, fornecedores]);

  const totalGeral = grupos.reduce((s, g) => s + g.total, 0);

  const confirmarQuitacao = async () => {
    if (!quitar) return;
    setSalvando(true);
    const { error } = await supabase
      .from("os_custos" as any)
      .update({ pago: true, data_pagamento: new Date().toISOString().slice(0, 10) })
      .in("id", quitar.ids);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success(`Quitação de ${brl(quitar.total)} registrada para ${quitar.nome}`);
    setQuitar(null);
    qc.invalidateQueries({ queryKey: ["valinhos"] });
    qc.invalidateQueries({ queryKey: ["os_custos"] });
  };

  if (!podeVerValoresFinanceiros) {
    return <div className="p-8 text-sm text-muted-foreground">Acesso restrito ao Diretor e Financeiro.</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/financeiro/fornecedores" className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Vales a pagar
          </h1>
          <p className="text-sm text-muted-foreground">Custos lançados nas OS e ainda não quitados, por fornecedor.</p>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Mês</label>
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-11 w-44" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Total pendente</p>
          <p className="text-2xl font-black tabular-nums">{brl(totalGeral)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Fornecedores</p>
          <p className="text-2xl font-black">{grupos.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Vales</p>
          <p className="text-2xl font-black">{custos.length}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhum vale pendente neste mês.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grupos.map((g) => (
            <div key={g.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{g.nome}</p>
                  <p className="text-xs text-muted-foreground">{g.ids.length} vale(s)</p>
                </div>
                <p className="text-lg font-black tabular-nums">{brl(g.total)}</p>
              </div>
              <ul className="text-xs space-y-1 max-h-40 overflow-auto border-t border-border pt-2">
                {g.itens.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {new Date(c.criado_em).toLocaleDateString("pt-BR")} · {c.descricao}
                    </span>
                    <span className="tabular-nums">{brl(Number(c.custo_interno))}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full font-bold uppercase text-xs" onClick={() => setQuitar(g)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar quitação
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!quitar} onOpenChange={(o) => !o && setQuitar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar quitação consolidada</AlertDialogTitle>
            <AlertDialogDescription>
              {quitar && `Marcar ${quitar.ids.length} vale(s) de ${quitar.nome} como pagos hoje, total ${brl(quitar.total)}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={(e) => { e.preventDefault(); confirmarQuitacao(); }}>
              {salvando ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
