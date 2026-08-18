import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Edit,
  Tag,
  Boxes,
  DollarSign,
  Info
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/produtos/")({
  component: ProdutosPage,
});

function ProdutosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProduto, setNewProduto] = useState({
    nome: "",
    descricao: "",
    preco_venda: "",
    estoque: "",
    categoria: ""
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createProdutoMutation = useMutation({
    mutationFn: async (produto: any) => {
      const { error } = await supabase.from("produtos").insert([
        {
          nome: produto.nome,
          descricao: produto.descricao,
          preco_venda: parseFloat(produto.preco_venda),
          estoque: parseInt(produto.estoque),
          categoria: produto.categoria
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto cadastrado com sucesso!");
      setIsDialogOpen(false);
      setNewProduto({ nome: "", descricao: "", preco_venda: "", estoque: "", categoria: "" });
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar produto: " + error.message);
    }
  });

  const deleteProdutoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir produto: " + error.message);
    }
  });

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">GESTÃO DE <span className="text-primary">PRODUTOS</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Controle de catálogo e estoque industrial.</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/20 border-b-4 border-black/20 active:border-b-0 transition-all">
              <Plus className="mr-2 h-5 w-5" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white">Novo <span className="text-primary">Produto</span></DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome do Produto</Label>
                <Input 
                  id="nome" 
                  value={newProduto.nome} 
                  onChange={(e) => setNewProduto({...newProduto, nome: e.target.value})}
                  className="bg-slate-950 border-slate-800 text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoria" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Categoria</Label>
                  <Input 
                    id="categoria" 
                    value={newProduto.categoria} 
                    onChange={(e) => setNewProduto({...newProduto, categoria: e.target.value})}
                    placeholder="Ex: Válvulas"
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estoque" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estoque Inicial</Label>
                  <Input 
                    id="estoque" 
                    type="number"
                    value={newProduto.estoque} 
                    onChange={(e) => setNewProduto({...newProduto, estoque: e.target.value})}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preco" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preço de Venda (R$)</Label>
                <Input 
                  id="preco" 
                  type="number"
                  step="0.01"
                  value={newProduto.preco_venda} 
                  onChange={(e) => setNewProduto({...newProduto, preco_venda: e.target.value})}
                  className="bg-slate-950 border-slate-800 text-white" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição Técnica</Label>
                <Textarea 
                  id="descricao" 
                  value={newProduto.descricao} 
                  onChange={(e) => setNewProduto({...newProduto, descricao: e.target.value})}
                  className="bg-slate-950 border-slate-800 text-white h-24" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createProdutoMutation.mutate(newProduto)}
                disabled={createProdutoMutation.isPending || !newProduto.nome || !newProduto.preco_venda}
                className="w-full bg-primary text-black font-bold uppercase tracking-widest"
              >
                Salvar Produto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por nome ou categoria..." 
                className="pl-10 bg-slate-950 border-slate-800 h-10 text-sm focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-10 border-slate-800 bg-slate-950 font-bold uppercase text-[10px] tracking-widest text-white">
                <Filter className="mr-2 h-4 w-4 text-primary" />
                Filtros
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => exportToCSV(produtos, 'produtos.csv')}
                className="h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Produto</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Categoria</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground text-center">Estoque</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground text-right">Preço Unitário</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest text-xs font-bold animate-pulse">
                      Carregando catálogo de produtos...
                    </td>
                  </tr>
                ) : filteredProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest text-xs font-bold">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProdutos.map((produto) => (
                    <tr key={produto.id} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center border border-slate-700">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">{produto.nome}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{produto.descricao || "Sem descrição técnica"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-slate-950 border-primary/20 text-primary uppercase text-[9px] font-black px-2 py-0.5">
                          {produto.categoria || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${produto.estoque < 5 ? 'text-red-500' : 'text-white'}`}>
                          {produto.estoque}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black text-primary">
                          R$ {produto.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if (window.confirm("Deseja realmente excluir este produto?")) {
                                deleteProdutoMutation.mutate(produto.id);
                              }
                            }}
                            className="h-8 w-8 hover:bg-red-500/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
