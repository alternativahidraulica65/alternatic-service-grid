import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  AlertCircle
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

export const Route = createFileRoute("/_authenticated/financeiro/fornecedores/")({
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<any>(null);

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
        <Button onClick={handleAddNew} className="bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs h-11">
          <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
        </Button>
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
    </div>
  );
}
