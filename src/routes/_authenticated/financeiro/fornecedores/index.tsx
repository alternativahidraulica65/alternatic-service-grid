import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  ChevronLeft,
  AlertCircle,
  AlertCircle,
  Upload,
  History,
  Info,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Rows3,
  Wallet,
  AlertTriangle,
  Crown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import Papa from "papaparse";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ClientOnly } from "@/components/ClientOnly";

export const Route = createFileRoute("/_authenticated/financeiro/fornecedores/")({
  component: FornecedoresPage,
  head: () => ({
    meta: [
      { title: "Fornecedores | Alternativa Hidráulica" },
      { name: "description", content: "Cadastro de fornecedores com painéis mensais de gastos reais, limites e evolução dos últimos seis meses." },
      { property: "og:title", content: "Fornecedores | Alternativa Hidráulica" },
      { property: "og:description", content: "Gastos mensais por fornecedor, limites e evolução em um só painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function ultimosSeisMeses() {
  const hoje = new Date();
  const meses: { chave: string; rotulo: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ chave: chaveMes(d), rotulo: format(d, "MMM", { locale: ptBR }).toUpperCase() });
  }
  return meses;
}


function FornecedoresPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<any>(null);
  const [importStatus, setImportStatus] = useState<{total: number, processed: number, errors: string[]} | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Validação de CNPJ
  const isValidCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    let t = cnpj.length - 2;
    let d = cnpj.substring(t);
    let b = cnpj.substring(0, t);
    let s = 0;
    let p = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    for (let i = t; i >= 1; i--) {
        s += parseInt(b.charAt(t - i)) * p[p.length - i - 1]!;
    }
    
    let res = s % 11 < 2 ? 0 : 11 - (s % 11);
    if (res !== parseInt(d.charAt(0))) return false;
    
    t = cnpj.length - 1;
    d = cnpj.substring(t);
    b = cnpj.substring(0, t);
    s = 0;
    p = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    for (let i = t; i >= 1; i--) {
        s += parseInt(b.charAt(t - i)) * p[p.length - i - 1]!;
    }
    
    res = s % 11 < 2 ? 0 : 11 - (s % 11);
    if (res !== parseInt(d.charAt(0))) return false;
    
    return true;
  };

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .upsert(formData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success(editingFornecedor ? "Fornecedor atualizado" : "Fornecedor cadastrado");
      setIsModalOpen(false);
      setEditingFornecedor(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success("Fornecedor excluído");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    }
  });

  const { data: auditoria } = useQuery({
    queryKey: ['auditoria-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_financeira')
        .select(`
          *,
          usuarios(nome)
        `)
        .eq('tabela', 'fornecedores')
        .order('criado_em', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAuditModalOpen
  });

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ total: 0, processed: 0, errors: [] });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        setImportStatus(prev => ({ ...prev!, total: rows.length }));
        
        const errors: string[] = [];
        const validRows: any[] = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2;
          if (!row.nome) {
            errors.push(`Linha ${rowNum}: Nome é obrigatório.`);
            return;
          }
          if (row.cnpj && !isValidCNPJ(row.cnpj)) {
            errors.push(`Linha ${rowNum}: CNPJ "${row.cnpj}" inválido.`);
            return;
          }
          validRows.push({
            nome: row.nome,
            cnpj: row.cnpj || null,
            contato: row.contato || null,
            limite_mensal: parseFloat(row.limite_mensal || '0'),
            observacoes: row.observacoes || '',
            ativo: true
          });
        });

        if (validRows.length > 0) {
          const { error } = await supabase.from('fornecedores').upsert(validRows);
          if (error) {
            errors.push(`Erro ao salvar no banco: ${error.message}`);
          } else {
            setImportStatus(prev => ({ ...prev!, processed: validRows.length }));
            queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
            toast.success(`${validRows.length} fornecedores importados com sucesso.`);
          }
        }

        setImportStatus(prev => ({ ...prev!, errors: [...prev!.errors, ...errors] }));
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const handleEdit = (fornecedor: any) => {
    setEditingFornecedor(fornecedor);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingFornecedor(null);
    setIsModalOpen(true);
  };

  const filteredFornecedores = fornecedores?.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj?.includes(searchTerm)
  );

  const meses = useMemo(() => ultimosSeisMeses(), []);
  const inicioPeriodo = useMemo(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString();
  }, []);

  const { data: gastos } = useQuery({
    queryKey: ['fornecedores-gastos', inicioPeriodo],
    queryFn: async () => {
      const [lanc, custos] = await Promise.all([
        supabase
          .from('lancamentos_financeiros')
          .select('fornecedor_id, valor, data_competencia')
          .not('fornecedor_id', 'is', null)
          .gte('data_competencia', inicioPeriodo.slice(0, 10)),
        supabase
          .from('os_custos')
          .select('fornecedor_id, custo_interno, criado_em')
          .not('fornecedor_id', 'is', null)
          .gte('criado_em', inicioPeriodo),
      ]);
      if (lanc.error) throw lanc.error;
      if (custos.error) throw custos.error;
      const registros: { fornecedor_id: string; valor: number; data: string }[] = [];
      (lanc.data || []).forEach((l) => {
        if (l.fornecedor_id && l.data_competencia) {
          registros.push({ fornecedor_id: l.fornecedor_id, valor: Number(l.valor || 0), data: l.data_competencia });
        }
      });
      (custos.data || []).forEach((c) => {
        if (c.fornecedor_id && c.criado_em) {
          registros.push({ fornecedor_id: c.fornecedor_id, valor: Number(c.custo_interno || 0), data: c.criado_em });
        }
      });
      return registros;
    },
  });

  const painelPorFornecedor = useMemo(() => {
    const mapa = new Map<string, {
      serie: { chave: string; rotulo: string; valor: number }[];
      mesAtual: number;
      mesAnterior: number;
      total: number;
      lancamentos: number;
    }>();
    (fornecedores || []).forEach((f) => {
      mapa.set(f.id, {
        serie: meses.map((m) => ({ ...m, valor: 0 })),
        mesAtual: 0,
        mesAnterior: 0,
        total: 0,
        lancamentos: 0,
      });
    });
    (gastos || []).forEach((r) => {
      const painel = mapa.get(r.fornecedor_id);
      if (!painel) return;
      const chave = chaveMes(new Date(r.data));
      const item = painel.serie.find((s) => s.chave === chave);
      if (!item) return;
      item.valor += r.valor;
      painel.total += r.valor;
      painel.lancamentos += 1;
    });
    mapa.forEach((painel) => {
      painel.mesAtual = painel.serie[painel.serie.length - 1]?.valor || 0;
      painel.mesAnterior = painel.serie[painel.serie.length - 2]?.valor || 0;
    });
    return mapa;
  }, [fornecedores, gastos, meses]);

  const resumo = useMemo(() => {
    let totalMes = 0;
    let estourados = 0;
    let maior: { nome: string; valor: number } | null = null;
    (fornecedores || []).forEach((f) => {
      const painel = painelPorFornecedor.get(f.id);
      const mesAtual = painel?.mesAtual || 0;
      totalMes += mesAtual;
      const limite = Number(f.limite_mensal || 0);
      if (limite > 0 && mesAtual > limite) estourados += 1;
      if (mesAtual > 0 && (!maior || mesAtual > maior.valor)) maior = { nome: f.nome, valor: mesAtual };
    });
    return {
      totalMes,
      estourados,
      maior: maior as { nome: string; valor: number } | null,
      ativos: (fornecedores || []).filter((f) => f.ativo).length,
      rotuloMesAtual: meses[meses.length - 1]?.rotulo || "",
    };
  }, [fornecedores, painelPorFornecedor, meses]);


  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/financeiro">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                <ChevronLeft className="h-5 w-5" />
             </Button>
          </Link>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight">GESTÃO DE <span className="text-primary">FORNECEDORES</span></h2>
            <p className="text-sm text-muted-foreground font-medium">Cadastro e manutenção de parceiros comerciais.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsAuditModalOpen(true)} className="border-border text-slate-600 font-bold uppercase tracking-widest text-xs h-11 px-6">
            <History className="mr-2 h-4 w-4" /> Auditoria
          </Button>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="border-border text-slate-600 font-bold uppercase tracking-widest text-xs h-11 px-6">
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={handleAddNew} className="bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs h-11 px-6">
            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-sm border-t-4 border-t-primary">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Gasto no mês</p>
            <p className="text-2xl font-black text-foreground">{brl(resumo.totalMes)}</p>
            <p className="text-[9px] font-medium text-muted-foreground mt-2 uppercase">{resumo.rotuloMesAtual} · todos os fornecedores</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-t-4 border-t-emerald-500">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fornecedores ativos</p>
            <p className="text-2xl font-black text-foreground">{resumo.ativos}</p>
            <p className="text-[9px] font-medium text-muted-foreground mt-2 uppercase">De {fornecedores?.length || 0} cadastrados</p>
          </CardContent>
        </Card>
        <Card className={`border-border shadow-sm border-t-4 ${resumo.estourados > 0 ? "border-t-red-500" : "border-t-slate-300"}`}>
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Limite estourado</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-black ${resumo.estourados > 0 ? "text-red-500" : "text-foreground"}`}>{resumo.estourados}</p>
              {resumo.estourados > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-2 uppercase">Acima do limite mensal</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-t-4 border-t-slate-900">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Maior gasto do mês</p>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary shrink-0" />
              <p className="text-base font-black text-foreground truncate">{resumo.maior ? resumo.maior.nome : "—"}</p>
            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-2 uppercase">{resumo.maior ? brl(resumo.maior.valor) : "Sem lançamentos no mês"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/10 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou CNPJ..." 
                className="pl-10 h-10 border-border bg-card shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <Button
                variant={visao === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVisao("cards")}
                className={`h-8 text-[10px] font-black uppercase tracking-widest ${visao === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Cards
              </Button>
              <Button
                variant={visao === "tabela" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVisao("tabela")}
                className={`h-8 text-[10px] font-black uppercase tracking-widest ${visao === "tabela" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Rows3 className="mr-2 h-3.5 w-3.5" /> Tabela
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !filteredFornecedores || filteredFornecedores.length === 0 ? (
            <div className="text-center py-20">
              <Truck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum fornecedor encontrado.</p>
            </div>
          ) : visao === "cards" ? (
            <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredFornecedores.map((f) => {
                const painel = painelPorFornecedor.get(f.id);
                const serie = painel?.serie || meses.map((m) => ({ ...m, valor: 0 }));
                const mesAtual = painel?.mesAtual || 0;
                const mesAnterior = painel?.mesAnterior || 0;
                const totalPeriodo = painel?.total || 0;
                const lancamentos = painel?.lancamentos || 0;
                const variacao = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : null;
                const limite = Number(f.limite_mensal || 0);
                const percentual = limite > 0 ? (mesAtual / limite) * 100 : null;
                const corBarra = percentual === null ? "" : percentual > 100 ? "bg-red-500" : percentual > 80 ? "bg-amber-500" : "bg-primary";
                return (
                  <div
                    key={f.id}
                    className={`rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${percentual !== null && percentual > 100 ? "border-red-500/40" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center border border-border shrink-0">
                          <Truck className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{f.nome}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{f.cnpj || "Sem CNPJ"}</p>
                          <p className="text-[10px] text-muted-foreground font-medium truncate">{f.contato || "Sem contato"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {f.ativo ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] uppercase font-bold">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[9px] uppercase font-bold">Inativo</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                            <DropdownMenuItem onClick={() => handleEdit(f)} className="hover:bg-white/10 cursor-pointer text-xs font-bold uppercase tracking-wider">
                              <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Deseja realmente excluir este fornecedor?")) {
                                  deleteMutation.mutate(f.id);
                                }
                              }}
                              className="text-red-400 hover:bg-red-500/10 cursor-pointer text-xs font-bold uppercase tracking-wider"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gasto em {resumo.rotuloMesAtual}</p>
                        <p className="text-2xl font-black text-foreground">{brl(mesAtual)}</p>
                      </div>
                      {variacao !== null && (
                        <span className={`flex items-center text-[10px] font-bold ${variacao > 0 ? "text-red-500" : "text-emerald-500"}`}>
                          {variacao > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {Math.abs(variacao).toFixed(0)}% vs. mês anterior
                        </span>
                      )}
                    </div>

                    {limite > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                          <span>Limite {brl(limite)}</span>
                          <span className={percentual! > 100 ? "text-red-500" : percentual! > 80 ? "text-amber-500" : ""}>{percentual!.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${Math.min(percentual!, 100)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 border-t border-border/60 pt-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Últimos 6 meses</p>
                      {totalPeriodo > 0 ? (
                        <ClientOnly>
                          <div className="h-16">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={serie} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: "#94a3b8" }} />
                                <Tooltip
                                  cursor={{ fill: "#f8fafc" }}
                                  formatter={(value: any) => [brl(Number(value)), "Gasto"]}
                                  contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "10px", fontWeight: "bold" }}
                                />
                                <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
                                  {serie.map((item, idx) => (
                                    <Cell key={idx} fill={limite > 0 && item.valor > limite ? "#ef4444" : idx === serie.length - 1 ? "#FFD700" : "#cbd5e1"} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ClientOnly>
                      ) : (
                        <p className="text-[10px] font-medium text-muted-foreground py-4 text-center">Sem lançamentos no período.</p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <span className="flex items-center gap-1"><Wallet className="h-3 w-3 text-primary" /> Acumulado {brl(totalPeriodo)}</span>
                        <span>{lancamentos} lançamento{lancamentos === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fornecedor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contato</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite Mensal</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFornecedores.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                            <Truck className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{f.nome}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter truncate max-w-[200px]">{f.observacoes}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-mono text-slate-600">{f.cnpj || '---'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {f.contato || '---'}
                      </td>
                      <td className="px-6 py-4">
                        {f.ativo ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase font-bold">Inativo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-foreground">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.limite_mensal || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                            <DropdownMenuItem onClick={() => handleEdit(f)} className="hover:bg-white/10 cursor-pointer text-xs font-bold uppercase tracking-wider">
                              <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm("Deseja realmente excluir este fornecedor?")) {
                                  deleteMutation.mutate(f.id);
                                }
                              }} 
                              className="text-red-400 hover:bg-red-500/10 cursor-pointer text-xs font-bold uppercase tracking-wider"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          setEditingFornecedor(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border shadow-2xl">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">
              {editingFornecedor ? "EDITAR" : "NOVO"} <span className="text-primary">FORNECEDOR</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-wider">
              Preencha os dados básicos do parceiro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: any = {
              nome: formData.get('nome'),
              cnpj: formData.get('cnpj'),
              contato: formData.get('contato'),
              limite_mensal: parseFloat(formData.get('limite_mensal') as string || '0'),
              observacoes: formData.get('observacoes'),
              ativo: formData.get('ativo') === 'on'
            };
            if (editingFornecedor) data.id = editingFornecedor.id;
            upsertMutation.mutate(data);
          }} className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="nome" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Fantasia / Razão Social</Label>
              <Input id="nome" name="nome" defaultValue={editingFornecedor?.nome} required className="border-border shadow-sm h-11" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cnpj" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ</Label>
                <Input id="cnpj" name="cnpj" defaultValue={editingFornecedor?.cnpj} placeholder="00.000.000/0000-00" className="border-border shadow-sm h-11 font-mono" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contato" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contato / Telefone</Label>
                <Input id="contato" name="contato" defaultValue={editingFornecedor?.contato} placeholder="(00) 00000-0000" className="border-border shadow-sm h-11" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="limite_mensal" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite Mensal de Gastos (R$)</Label>
              <Input id="limite_mensal" name="limite_mensal" type="number" step="0.01" defaultValue={editingFornecedor?.limite_mensal || 0} className="border-border shadow-sm h-11 font-black" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observacoes" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Observações Internas</Label>
              <Textarea id="observacoes" name="observacoes" defaultValue={editingFornecedor?.observacoes} rows={3} className="border-border shadow-sm resize-none" />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="ativo" 
                name="ativo" 
                defaultChecked={editingFornecedor ? editingFornecedor.ativo : true}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="ativo" className="text-xs font-bold uppercase tracking-wider cursor-pointer">Fornecedor Ativo</Label>
            </div>

            <DialogFooter className="pt-6 border-t border-border mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs font-bold uppercase tracking-widest">Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs px-8 h-11" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? "Salvando..." : "Salvar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> IMPORTAR <span className="text-primary">FORNECEDORES</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-wider">
              Selecione um arquivo CSV com as colunas: nome, cnpj, contato, limite_mensal, observacoes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportCSV} 
              accept=".csv" 
              className="hidden" 
            />
            {isImporting ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Processando dados...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-bold text-foreground">Clique para selecionar arquivo</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Formato suportado: .CSV</p>
              </>
            )}
          </div>

          {importStatus && (importStatus.processed > 0 || importStatus.errors.length > 0) && (
            <div className="mt-4 p-4 rounded-lg bg-slate-900 text-white space-y-2 max-h-[200px] overflow-y-auto">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/10 pb-2">
                <span>Resultado do Processamento</span>
                <span className="text-primary">{importStatus.processed} / {importStatus.total} OK</span>
              </div>
              {importStatus.errors.map((error, idx) => (
                <div key={idx} className="text-[10px] text-red-400 flex gap-2">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {error}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => {
              setIsImportModalOpen(false);
              setImportStatus(null);
            }} className="text-xs font-bold uppercase tracking-widest">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Auditoria */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-border pb-4 mb-2">
            <DialogTitle className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> HISTÓRICO DE <span className="text-primary">AUDITORIA</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-wider">
              Rastreabilidade de alterações realizadas na gestão de fornecedores.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 pr-2">
            {!auditoria ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : auditoria.length > 0 ? (
              <div className="space-y-4">
                {auditoria.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl border border-border bg-slate-50/50 hover:bg-white transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[9px] uppercase font-black px-2 ${
                          log.acao === 'INSERT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          log.acao === 'UPDATE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {log.acao}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-900 uppercase">
                          {(log as any).usuarios?.nome || 'Sistema / Dev'}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">
                        {log.criado_em ? format(new Date(log.criado_em), "dd MMM yyyy 'às' HH:mm", { locale: ptBR }) : '---'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-3 w-3 text-primary" />
                      <p className="text-[11px] font-bold text-slate-700">
                        Registro: <span className="font-mono text-[9px] text-muted-foreground">{log.registro_id}</span>
                      </p>
                    </div>

                    {log.acao === 'UPDATE' && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Anterior</p>
                          <p className="text-[10px] font-medium text-red-600 bg-red-50 p-2 rounded border border-red-100/50 truncate">
                            {JSON.stringify(log.valores_antigos)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Novo</p>
                          <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100/50 truncate">
                            {JSON.stringify(log.valores_novos)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum registro de auditoria encontrado.</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border mt-2">
            <Button variant="ghost" onClick={() => setIsAuditModalOpen(false)} className="text-xs font-bold uppercase tracking-widest">Fechar Histórico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
