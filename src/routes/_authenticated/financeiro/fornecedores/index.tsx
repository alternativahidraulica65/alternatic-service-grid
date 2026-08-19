import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  History,
  Info
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

export const Route = createFileRoute("/_authenticated/financeiro/fornecedores/")({
  component: FornecedoresPage,
});

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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredFornecedores && filteredFornecedores.length > 0 ? (
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
          ) : (
            <div className="text-center py-20">
              <Truck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum fornecedor encontrado.</p>
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
