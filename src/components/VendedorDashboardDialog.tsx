import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientOnly } from "@/components/ClientOnly";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Legend } from "recharts";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const norm = (s?: string | null) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const STATUS_FECHADA = ["aprovada", "aprovado", "execucao", "em_execucao", "pronto", "entregue", "finalizada", "encerrado"];

function classificar(o: any): "fechada" | "recusada" | "aberta" {
  const st = norm(o.status), fin = norm(o.status_financeiro);
  if (fin.includes("recusad") || st.includes("recusad") || st.includes("cancelad")) return "recusada";
  if (fin === "aprovado" || STATUS_FECHADA.includes(st)) return "fechada";
  return "aberta";
}

type Linha = { mes: string; feitas: number; fechadas: number; recusadas: number; vendido: number; lucro: number; comissao: number; pago: number; aPagar: number };

export function VendedorDashboardDialog({ vendedor, onClose }: { vendedor: any | null; onClose: () => void }) {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const id = vendedor?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["vendedor-dashboard", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, numero_os, status, status_financeiro, valor_total, valor_final, custo_base, imposto_aplicado, comissao_calculada, data_abertura, criado_em, clientes!inner(vendedor_id)")
        .eq("clientes.vendedor_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const r = useMemo(() => {
    const vazio = (mes: string): Linha => ({ mes, feitas: 0, fechadas: 0, recusadas: 0, vendido: 0, lucro: 0, comissao: 0, pago: 0, aPagar: 0 });
    const meses = MESES.map(vazio);
    const total = vazio("Total");
    const ano_ = vazio("Ano");
    const somar = (l: Linha, o: any) => {
      const c = classificar(o);
      l.feitas++;
      if (c === "recusada") { l.recusadas++; return; }
      if (c !== "fechada") return;
      const venda = Number(o.valor_final ?? o.valor_total ?? 0);
      const comissao = Number(o.comissao_calculada || 0);
      const lucro = venda - Number(o.custo_base || 0) - Number(o.imposto_aplicado || 0) - comissao;
      l.fechadas++; l.vendido += venda; l.lucro += lucro; l.comissao += comissao;
      if (norm(o.status) === "entregue") l.pago += comissao; else l.aPagar += comissao;
    };
    for (const o of data ?? []) {
      somar(total, o);
      const d = new Date((o.data_abertura || o.criado_em) as string);
      if (d.getFullYear() === ano) { somar(meses[d.getMonth()]!, o); somar(ano_, o); }
    }
    return { meses, total, ano: ano_ };
  }, [data, ano]);

  const conv = (l: Linha) => (l.fechadas + l.recusadas ? Math.round((l.fechadas / (l.fechadas + l.recusadas)) * 100) : null);
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i);

  const Kpi = ({ t, v, s }: { t: string; v: string; s?: string }) => (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t}</p>
      <p className="text-lg font-black text-foreground">{v}</p>
      {s && <p className="text-[11px] text-muted-foreground">{s}</p>}
    </div>
  );

  return (
    <Dialog open={!!vendedor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-black">{vendedor?.nome}</DialogTitle>
              <DialogDescription>Desempenho por mês e acumulado total, com base nas OS dos clientes deste vendedor.</DialogDescription>
            </div>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
          : error ? <p className="py-10 text-center text-sm text-destructive">Erro ao carregar: {(error as Error).message}</p>
          : (
          <div className="space-y-5">
            {[{ l: r.ano, t: `Ano ${ano}` }, { l: r.total, t: "Acumulado total" }].map(({ l, t }) => (
              <div key={t}>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-foreground">{t}</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Kpi t="OS feitas" v={String(l.feitas)} s={`${l.fechadas} aprovadas · ${l.recusadas} recusadas`} />
                  <Kpi t="Conversão" v={conv(l) === null ? "—" : `${conv(l)}%`} s="aprovadas ÷ (aprovadas + recusadas)" />
                  <Kpi t="Vendedor ganhou" v={brl(l.comissao)} s={`Pago ${brl(l.pago)} · A pagar ${brl(l.aPagar)}`} />
                  <Kpi t="Empresa lucrou" v={brl(l.lucro)} s={`Vendido ${brl(l.vendido)}`} />
                </div>
              </div>
            ))}

            <div className="h-56 rounded-md border border-border p-2">
              <ClientOnly>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.meses}>
                    <XAxis dataKey="mes" fontSize={11} />
                    <Tooltip formatter={(v) => brl(Number(v))} />
                    <Legend />
                    <Bar dataKey="lucro" name="Lucro empresa" fill="hsl(var(--foreground))" />
                    <Bar dataKey="comissao" name="Comissão vendedor" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>{["Mês", "Feitas", "Aprov.", "Recus.", "Conv.", "Vendido", "Lucro empresa", "Comissão", "Pago", "A pagar"].map((h) => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[...r.meses, { ...r.ano, mes: `Total ${ano}` }].map((m) => (
                    <tr key={m.mes} className={m.mes.startsWith("Total") ? "border-t-2 border-border font-black" : "border-t border-border"}>
                      <td className="px-2 py-1.5 font-bold">{m.mes}</td>
                      <td className="px-2">{m.feitas}</td><td className="px-2">{m.fechadas}</td><td className="px-2">{m.recusadas}</td>
                      <td className="px-2">{conv(m) === null ? "—" : `${conv(m)}%`}</td>
                      <td className="px-2">{brl(m.vendido)}</td><td className="px-2">{brl(m.lucro)}</td>
                      <td className="px-2">{brl(m.comissao)}</td><td className="px-2">{brl(m.pago)}</td><td className="px-2">{brl(m.aPagar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">Comissão "paga" = OS já entregue; "a pagar" = OS aprovada ainda não entregue. Lucro = valor final − custo − imposto − comissão.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
