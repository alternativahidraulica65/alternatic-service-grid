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
import { addMesesIso } from "@/lib/financeiro";

export const CATEGORIAS_DESPESA = ["Energia", "Água", "Aluguel", "Folha de pagamento", "Pró-labore", "Encargos", "Contabilidade", "Internet/Telefone", "Administrativo", "Ferramentas", "Manutenção predial", "Impostos e taxas", "Combustível", "Fornecedor", "Outros"];
export const CATEGORIAS_RECEITA = ["Serviço avulso", "Venda de peças", "Adiantamento de cliente", "Outros"];
export const FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Boleto", "Cartão", "Transferência"];

const hojeIso = () => new Date().toISOString().slice(0, 10);
const paraNumero = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

const invalidarFinanceiro = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["financeiro-completo"] });
  qc.invalidateQueries({ queryKey: ["fin-dashboard-v2"] });
};

function useContas(ativo: boolean) {
  return useQuery({
    queryKey: ["contas_bancarias_select"],
    enabled: ativo,
    queryFn: async () => {
      const { data } = await (supabase as any).from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as { id: string; nome: string }[];
    },
  });
}

export function NovaDespesaDialog({ tipo = "despesa" }: { tipo?: "despesa" | "receita" }) {
  const qc = useQueryClient();
  const receita = tipo === "receita";
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [f, setF] = useState({
    descricao: "", categoria: receita ? "Serviço avulso" : "Administrativo", valor: "", data: hojeIso(), vencimento: hojeIso(),
    fornecedor: "nenhum", conta: "nenhuma", pago: false, dataPg: hojeIso(), forma: "PIX", repetir: false, meses: "12",
  });
  const set = (k: keyof typeof f, v: any) => setF((a) => ({ ...a, [k]: v }));

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_select"],
    enabled: aberto && !receita,
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome").order("nome");
      return data ?? [];
    },
  });
  const { data: contas = [] } = useContas(aberto);

  async function salvar() {
    const valor = paraNumero(f.valor);
    if (!f.descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (valor <= 0) { toast.error("Informe um valor maior que zero."); return; }
    const meses = f.repetir ? Math.min(Math.max(parseInt(f.meses) || 1, 1), 36) : 1;
    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    const grupo = meses > 1 ? crypto.randomUUID() : null;
    const linhas = Array.from({ length: meses }, (_, i) => {
      const pagoAgora = f.pago && i === 0;
      return {
        descricao: meses > 1 ? `${f.descricao.trim()} (${i + 1}/${meses})` : f.descricao.trim(),
        categoria: f.categoria, tipo, valor,
        data_competencia: addMesesIso(f.data, i), data_vencimento: addMesesIso(f.vencimento, i),
        fornecedor_id: !receita && f.fornecedor !== "nenhum" ? f.fornecedor : null,
        conta_bancaria_id: f.conta === "nenhuma" ? null : f.conta,
        recorrencia_grupo: grupo, parcela: meses > 1 ? i + 1 : null, total_parcelas: meses > 1 ? meses : null,
        pago: pagoAgora, data_pagamento: pagoAgora ? f.dataPg : null, forma_pagamento: pagoAgora ? f.forma : null,
        valor_pago: pagoAgora ? valor : null, baixado_por: pagoAgora ? u.user?.id ?? null : null, criado_por: u.user?.id ?? null,
      };
    });
    const { error } = await (supabase as any).from("lancamentos_financeiros").insert(linhas);
    setSalvando(false);
    if (error) { toast.error(`Erro ao salvar: ${error.message}`); return; }
    toast.success(meses > 1 ? `${meses} lançamentos mensais criados.` : receita ? "Receita lançada." : "Despesa lançada.");
    setAberto(false);
    setF({ ...f, descricao: "", valor: "" });
    invalidarFinanceiro(qc);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant={receita ? "outline" : "default"} className="h-10 font-bold uppercase text-[10px] tracking-widest">
          <Plus className="mr-1 h-4 w-4" /> {receita ? "Nova receita" : "Nova despesa"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{receita ? "Nova receita avulsa" : "Nova despesa / conta a pagar"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Descrição</Label><Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder={receita ? "Ex.: Venda de vedações" : "Ex.: Conta de energia"} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label>
              <Select value={f.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(receita ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$)</Label><Input inputMode="decimal" value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" /></div>
            <div><Label>Competência</Label><Input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={f.vencimento} onChange={(e) => set("vencimento", e.target.value)} /></div>
            {!receita && (
              <div><Label>Fornecedor (opcional)</Label>
                <Select value={f.fornecedor} onValueChange={(v) => set("fornecedor", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {fornecedores.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Conta bancária</Label>
              <Select value={f.conta} onValueChange={(v) => set("conta", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não definida</SelectItem>
                  {contas.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={f.repetir} onCheckedChange={(v) => set("repetir", !!v)} /> Repetir todo mês (recorrente)</label>
          {f.repetir && (
            <div className="w-40"><Label>Quantidade de meses</Label><Input inputMode="numeric" value={f.meses} onChange={(e) => set("meses", e.target.value)} /></div>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={f.pago} onCheckedChange={(v) => set("pago", !!v)} /> {receita ? "Já foi recebido" : "Já foi pago"}</label>
          {f.pago && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={f.dataPg} onChange={(e) => set("dataPg", e.target.value)} /></div>
              <div><Label>Forma</Label>
                <Select value={f.forma} onValueChange={(v) => set("forma", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS_PAGAMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BaixarDespesaDialog({ lancamento }: { lancamento: any }) {
  const qc = useQueryClient();
  const receita = lancamento.tipo === "receita";
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [forma, setForma] = useState(receita ? "Boleto" : "PIX");
  const [conta, setConta] = useState<string>(lancamento.conta_bancaria_id ?? "nenhuma");
  const [valor, setValor] = useState(String(Number(lancamento.valor || 0).toFixed(2)).replace(".", ","));
  const { data: contas = [] } = useContas(aberto);

  async function baixar() {
    const v = paraNumero(valor);
    if (v <= 0) { toast.error("Informe o valor."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("lancamentos_financeiros")
      .update({
        pago: true, data_pagamento: data, forma_pagamento: forma, valor_pago: v,
        juros_desconto: Math.round((v - Number(lancamento.valor || 0)) * 100) / 100,
        conta_bancaria_id: conta === "nenhuma" ? null : conta, baixado_por: u.user?.id ?? null,
      })
      .eq("id", lancamento.id);
    if (error) { toast.error(`Erro na baixa: ${error.message}`); return; }
    toast.success(receita ? "Recebimento registrado." : "Pagamento registrado.");
    setAberto(false);
    invalidarFinanceiro(qc);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase">{receita ? "Receber" : "Pagar"}</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{receita ? "Registrar recebimento" : "Registrar pagamento"}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{lancamento.descricao}</p>
        <div className="grid gap-3">
          <div><Label>Valor efetivo (R$) — com juros ou desconto</Label><Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Forma</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FORMAS_PAGAMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Conta bancária</Label>
            <Select value={conta} onValueChange={setConta}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Não definida</SelectItem>
                {contas.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={baixar}>Confirmar baixa</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
