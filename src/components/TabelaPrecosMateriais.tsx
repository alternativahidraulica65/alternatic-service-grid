import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Linha = any;
const COLS: { k: string; label: string; w: string; num?: boolean }[] = [
  { k: "especificacao", label: "Especificação", w: "min-w-[180px]" },
  { k: "acabamento", label: "Acabamento", w: "min-w-[130px]" },
  { k: "formato", label: "Formato", w: "w-24" },
  { k: "diametro_mm", label: "Ø ext (mm)", w: "w-24", num: true },
  { k: "diametro_int_mm", label: "Ø int (mm)", w: "w-24", num: true },
  { k: "faixa_min_mm", label: "Faixa mín", w: "w-24", num: true },
  { k: "faixa_max_mm", label: "Faixa máx", w: "w-24", num: true },
  { k: "densidade", label: "g/cm³", w: "w-20", num: true },
  { k: "preco_kg", label: "R$/kg", w: "w-24", num: true },
  { k: "ipi_percentual", label: "IPI %", w: "w-20", num: true },
  { k: "data_referencia", label: "Data", w: "w-36" },
];

const toNum = (v: any) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));

export function TabelaPrecosMateriais() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Record<string, Linha>>({});
  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["materiais_precos_referencia_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materiais_precos_referencia" as any).select("*").order("especificacao").order("diametro_mm");
      if (error) throw error;
      return (data ?? []) as Linha[];
    },
  });

  const val = (r: Linha, k: string) => edit[r.id]?.[k] ?? r[k] ?? "";
  const set = (r: Linha, k: string, v: any) => setEdit((e) => ({ ...e, [r.id]: { ...(e[r.id] ?? {}), [k]: v } }));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["materiais_precos_referencia_admin"] });
    qc.invalidateQueries({ queryKey: ["materiais_precos_referencia"] });
  };

  const salvar = async (r: Linha): Promise<void> => {
    const ch = edit[r.id];
    if (!ch) return;
    const payload: Linha = {};
    for (const [k, v] of Object.entries(ch)) payload[k] = COLS.find((c) => c.k === k)?.num ? toNum(v) : v || null;
    if (payload.preco_kg != null && !(payload.preco_kg > 0)) { toast.error("Preço por kg deve ser maior que zero"); return; }
    if (!payload.especificacao && "especificacao" in payload) { toast.error("Informe a especificação"); return; }
    const { error } = await supabase.from("materiais_precos_referencia" as any).update(payload).eq("id", r.id);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    setEdit((e) => { const n = { ...e }; delete n[r.id]; return n; });
    toast.success("Preço atualizado");
    refresh();
  };

  const novo = async () => {
    const { error } = await supabase.from("materiais_precos_referencia" as any).insert({ especificacao: "Nova especificação", formato: "redondo", preco_kg: 0.01 });
    if (error) { toast.error("Erro: " + error.message); return; }
    refresh();
  };

  const ativo = async (r: Linha, v: boolean) => {
    const { error } = await supabase.from("materiais_precos_referencia" as any).update({ ativo: v }).eq("id", r.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    refresh();
  };

  const remover = async (r: Linha) => {
    if (!confirm(`Remover ${r.especificacao}?`)) return;
    const { error } = await supabase.from("materiais_precos_referencia" as any).delete().eq("id", r.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div>
          <CardTitle className="text-sm font-black uppercase tracking-widest">Tabela de preços de matéria-prima</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Use medida exata (Ø ext) ou faixa (mín/máx). Formato: redondo ou tubo. Sem regra cadastrada, a calculadora não estima preço.</p>
        </div>
        <Button onClick={novo} className="font-bold"><Plus className="h-4 w-4 mr-1" /> Nova linha</Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : (
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                {COLS.map((c) => <th key={c.k} className="px-2 py-2 text-left font-black uppercase tracking-wider text-[10px]">{c.label}</th>)}
                <th className="px-2 py-2 text-[10px] font-black uppercase">Ativo</th><th />
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <tr key={r.id} className="border-t">
                  {COLS.map((c) => (
                    <td key={c.k} className="px-1 py-1">
                      {c.k === "formato" ? (
                        <select value={val(r, c.k)} onChange={(e) => set(r, c.k, e.target.value)} className="h-8 rounded-sm border bg-background px-1 w-24">
                          <option value="redondo">Redondo</option><option value="tubo">Tubo</option>
                        </select>
                      ) : (
                        <Input type={c.k === "data_referencia" ? "date" : "text"} value={String(val(r, c.k))} onChange={(e) => set(r, c.k, e.target.value)} className={`h-8 text-xs ${c.w}`} inputMode={c.num ? "decimal" : undefined} />
                      )}
                    </td>
                  ))}
                  <td className="px-2"><Switch checked={!!r.ativo} onCheckedChange={(v) => ativo(r, v)} /></td>
                  <td className="px-1 whitespace-nowrap">
                    <Button size="icon" variant="ghost" disabled={!edit[r.id]} onClick={() => salvar(r)} title="Salvar"><Save className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(r)} title="Remover"><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
