import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

export const CATEGORIAS_DESPESA = ["Energia", "Água", "Aluguel", "Administrativo", "Ferramentas", "Manutenção predial", "Impostos e taxas", "Combustível", "Outros"];
export const FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Boleto", "Cartão", "Transferência"];

const hojeIso = () => new Date().toISOString().slice(0, 10);
const paraNumero = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

export function NovaDespesaDialog() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [f, setF] = useState({ descricao: "", categoria: "Administrativo", valor: "", data: hojeIso(), fornecedor: "nenhum", pago: true, dataPg: hojeIso(), forma: "Dinheiro" });
  const set = (k: keyof typeof f, v: any) => setF((a) => ({ ...a, [k]: v }));

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_select"],
    enabled: aberto,
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  async function salvar() {
    const valor = paraNumero(f.valor);
    if (!f.descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (valor <= 0) { toast.error("Informe um valor maior que zero."); return; }
    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("lancamentos_financeiros").insert({
      descricao: f.descricao.trim(), categoria: f.categoria, tipo: "despesa", valor,
      data_competencia: f.data, fornecedor_id: f.fornecedor === "nenhum" ? null : f.fornecedor,
      pago: f.pago, data_pagamento: f.pago ? f.dataPg : null, forma_pagamento: f.pago ? f.forma : null,
      valor_pago: f.pago ? valor : null, baixado_por: f.pago ? u.user?.id ?? null : null, criado_por: u.user?.id ?? null,
    });
    setSalvando(false);
    if (error) { toast.error(`Erro ao salvar: ${error.message}`); return; }
    toast.success("Despesa lançada.");
    setAberto(false);
    setF({ ...f, descricao: "", valor: "" });
    qc.invalidateQueries({ queryKey: ["lancamentos_lista"] });
    qc.invalidateQueries({ queryKey: ["fin-dashboard-v2"] });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-10 font-bold uppercase text-[10px] tracking-widest"><Plus className="mr-1 h-4 w-4" /> Nova despesa</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova despesa avulsa</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Descrição</Label><Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex.: Conta de energia" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label>
              <Select value={f.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS_DESPESA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$)</Label><Input inputMode="decimal" value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" /></div>
            <div><Label>Competência</Label><Input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} /></div>
            <div><Label>Fornecedor (opcional)</Label>
              <Select value={f.fornecedor} onValueChange={(v) => set("fornecedor", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {fornecedores.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={f.pago} onCheckedChange={(v) => set("pago", !!v)} /> Já foi pago</label>
          {f.pago && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data do pagamento</Label><Input type="date" value={f.dataPg} onChange={(e) => set("dataPg", e.target.value)} /></div>
              <div><Label>Forma</Label>
                <Select value={f.forma} onValueChange={(v) => set("forma", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS_PAGAMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar despesa"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BaixarDespesaDialog({ lancamento }: { lancamento: any }) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [forma, setForma] = useState("Dinheiro");
  const [valor, setValor] = useState(String(Number(lancamento.valor || 0).toFixed(2)).replace(".", ","));

  async function baixar() {
    const v = paraNumero(valor);
    if (v <= 0) { toast.error("Informe o valor pago."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("lancamentos_financeiros")
      .update({ pago: true, data_pagamento: data, forma_pagamento: forma, valor_pago: v, baixado_por: u.user?.id ?? null })
      .eq("id", lancamento.id);
    if (error) { toast.error(`Erro na baixa: ${error.message}`); return; }
    toast.success("Pagamento registrado.");
    setAberto(false);
    qc.invalidateQueries({ queryKey: ["lancamentos_lista"] });
    qc.invalidateQueries({ queryKey: ["fin-dashboard-v2"] });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase">Baixar</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{lancamento.descricao}</p>
        <div className="grid gap-3">
          <div><Label>Valor pago (R$)</Label><Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Forma</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FORMAS_PAGAMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={baixar}>Confirmar baixa</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
