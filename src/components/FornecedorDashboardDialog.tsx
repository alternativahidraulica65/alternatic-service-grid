import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/ClientOnly";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Legend } from "recharts";
import { AlertTriangle, CheckCircle2, Wallet, CalendarRange } from "lucide-react";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Props = { fornecedor: any | null; onClose: () => void };

export function FornecedorDashboardDialog({ fornecedor, onClose }: Props) {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const id = fornecedor?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["fornecedor-dashboard", id, ano],
    enabled: !!id,
    queryFn: async () => {
      const ini = `${ano}-01-01`;
      const fim = `${ano + 1}-01-01`;
      const [custos, lancs] = await Promise.all([
        supabase.from("os_custos").select("id, descricao, custo_interno, pago, data_pagamento, criado_em, os_id")
          .eq("fornecedor_id", id).gte("criado_em", ini).lt("criado_em", fim),
        supabase.from("lancamentos_financeiros").select("id, valor, data_competencia, descricao")
          .eq("fornecedor_id", id).gte("data_competencia", ini).lt("data_competencia", fim),
      ]);
      if (custos.error) throw custos.error;
      if (lancs.error) throw lancs.error;
      return { custos: custos.data ?? [], lancs: lancs.data ?? [] };
    },
  });

  const resumo = useMemo(() => {
    const meses = MESES.map((m) => ({ mes: m, pago: 0, devendo: 0, lancamentos: 0 }));
    let pago = 0, devendo = 0;
    for (const c of data?.custos ?? []) {
      const v = Number(c.custo_interno || 0);
      const m = new Date(c.criado_em as string).getMonth();
      meses[m]!.lancamentos++;
      if (c.pago) { pago += v; meses[m]!.pago += v; } else { devendo += v; meses[m]!.devendo += v; }
    }
    // Lançamentos financeiros diretos são considerados quitados.
    for (const l of data?.lancs ?? []) {
      const v = Number(l.valor || 0);
      const m = new Date(`${l.data_competencia}T12:00:00`).getMonth();
      meses[m]!.lancamentos++;
      pago += v; meses[m]!.pago += v;
    }
    const mesAtual = ano === anoAtual ? new Date().getMonth() : 11;
    const gastoMes = meses[mesAtual]!.pago + meses[mesAtual]!.devendo;
    return { meses, pago, devendo, total: pago + devendo, mesAtual, gastoMes };
  }, [data, ano, anoAtual]);

  const teto = Number(fornecedor?.limite_mensal || 0);
  const pct = teto > 0 ? (resumo.gastoMes / teto) * 100 : 0;

  return (
    <Dialog open={!!fornecedor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">{fornecedor?.nome}</DialogTitle>
              <DialogDescription className="text-[10px] font-mono">{fornecedor?.cnpj || "Sem CNPJ"}</DialogDescription>
            </div>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="h-9 w-28 font-bold text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((d) => <SelectItem key={d} value={String(anoAtual - d)}>{anoAtual - d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando dados…</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Em aberto (devendo)" valor={brl(resumo.devendo)} destaque={resumo.devendo > 0} />
              <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Já pago" valor={brl(resumo.pago)} />
              <Kpi icon={<CalendarRange className="h-4 w-4" />} label={`Acumulado ${ano}`} valor={brl(resumo.total)} />
              <Kpi icon={<Wallet className="h-4 w-4" />} label={`Gasto ${MESES[resumo.mesAtual]}`} valor={brl(resumo.gastoMes)} />
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Teto mensal de gastos (acompanhamento)</span>
                <span>{teto > 0 ? `${brl(resumo.gastoMes)} de ${brl(teto)}` : "Não definido"}</span>
              </div>
              {teto > 0 && (
                <>
                  <Progress value={Math.min(pct, 100)} className={pct > 100 ? "[&>div]:bg-destructive" : pct > 80 ? "[&>div]:bg-primary" : ""} />
                  <p className={`text-xs font-bold ${pct > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                    {pct > 100 ? `Teto ultrapassado em ${brl(resumo.gastoMes - teto)}` : `${pct.toFixed(0)}% do teto utilizado`}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-md border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Evolução mensal — pago x em aberto</p>
              <div className="h-56">
                <ClientOnly>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resumo.meses}>
                      <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="pago" name="Pago" stackId="a" fill="hsl(var(--foreground))" />
                      <Bar dataKey="devendo" name="Em aberto" stackId="a" fill="#FFD700" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientOnly>
              </div>
            </div>

            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="text-left p-2">Mês</th><th className="text-right p-2">Lanç.</th><th className="text-right p-2">Pago</th><th className="text-right p-2">Em aberto</th><th className="text-right p-2">Total</th><th className="p-2"></th></tr>
                </thead>
                <tbody>
                  {resumo.meses.map((m) => {
                    const tot = m.pago + m.devendo;
                    if (!tot && !m.lancamentos) return null;
                    return (
                      <tr key={m.mes} className="border-t border-border">
                        <td className="p-2 font-bold">{m.mes}</td>
                        <td className="p-2 text-right">{m.lancamentos}</td>
                        <td className="p-2 text-right">{brl(m.pago)}</td>
                        <td className={`p-2 text-right ${m.devendo > 0 ? "font-bold text-destructive" : ""}`}>{brl(m.devendo)}</td>
                        <td className="p-2 text-right font-black">{brl(tot)}</td>
                        <td className="p-2 text-right">{teto > 0 && tot > teto && <Badge variant="destructive" className="text-[9px]">Acima do teto</Badge>}</td>
                      </tr>
                    );
                  })}
                  {resumo.total === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem lançamentos em {ano}.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ icon, label, valor, destaque }: { icon: React.ReactNode; label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${destaque ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
      <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${destaque ? "text-destructive" : "text-muted-foreground"}`}>{icon}{label}</div>
      <p className="mt-1 text-base font-black text-foreground">{valor}</p>
    </div>
  );
}
