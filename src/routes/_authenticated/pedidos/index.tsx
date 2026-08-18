import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  Download, 
  Trash2, 
  ShoppingCart,
  User,
  Calendar,
  DollarSign,
  Package,
  Minus,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/pedidos/index")({
  component: PedidosPage,
});

type ItemPedidoInput = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  nome: string;
};

function PedidosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // State para o novo pedido
  const [selectedCliente, setSelectedCliente] = useState("");
  const [itens, setItens] = useState<ItemPedidoInput[]>([]);
  const [selectedProduto, setSelectedProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, clientes(nome_fantasia)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_simples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome_fantasia");
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos_simples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome, preco_venda, estoque");
      if (error) throw error;
      return data;
    },
  });

  const addProdutoAoPedido = () => {
    const produto = produtos.find(p => p.id === selectedProduto);
    if (!produto) return;

    const itemExistente = itens.find(i => i.produto_id === selectedProduto);
    if (itemExistente) {
      setItens(itens.map(i => 
        i.produto_id === selectedProduto 
          ? { ...i, quantidade: i.quantidade + quantidade } 
          : i
      ));
    } else {
      setItens([...itens, {
        produto_id: produto.id,
        nome: produto.nome,
        quantidade: quantidade,
        preco_unitario: produto.preco_venda
      }]);
    }
    setQuantidade(1);
    setSelectedProduto("");
  };

  const removeItem = (id: string) => {
    setItens(itens.filter(i => i.produto_id !== id));
  };

  const valorTotalPedido = useMemo(() => {
    return itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
  }, [itens]);

  const createPedidoMutation = useMutation({
    mutationFn: async () => {
      // 1. Inserir Pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert([{
          cliente_id: selectedCliente,
          valor_total: valorTotalPedido,
          status: 'pendente'
        }])
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // 2. Inserir Itens
      const itensToInsert = itens.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.quantidade * item.preco_unitario
      }));

      const { error: itensError } = await supabase.from("itens_pedido").insert(itensToInsert);
      if (itensError) throw itensError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      toast.success("Pedido gerado com sucesso!");
      setIsDialogOpen(false);
      setItens([]);
      setSelectedCliente("");
    },
    onError: (error: any) => {
      toast.error("Erro ao gerar pedido: " + error.message);
    }
  });

  const filteredPedidos = pedidos.filter(p => 
    p.clientes?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero_pedido.toString().includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[9px] font-black"><Clock className="mr-1 h-3 w-3" /> Pendente</Badge>;
      case 'pago': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase text-[9px] font-black"><CheckCircle2 className="mr-1 h-3 w-3" /> Pago</Badge>;
      case 'cancelado': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 uppercase text-[9px] font-black"><AlertCircle className="mr-1 h-3 w-3" /> Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">GESTÃO DE <span className="text-primary">PEDIDOS</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Fluxo de vendas e faturamento industrial.</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/20 border-b-4 border-black/20 active:border-b-0 transition-all">
              <Plus className="mr-2 h-5 w-5" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-slate-900 border-slate-800 text-white overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Novo <span className="text-primary">Pedido de Venda</span></DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Seleção de Cliente */}
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente Emissor</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-white hover:bg-primary/20">{c.nome_fantasia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-slate-800" />

              {/* Adicionar Itens */}
              <div className="grid gap-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Carrinho de Itens
                </h4>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                      <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Escolha um produto..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        {produtos.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-white">{p.nome} (R$ {p.preco_venda})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="number" 
                      min={1} 
                      value={quantidade} 
                      onChange={(e) => setQuantidade(parseInt(e.target.value))}
                      className="bg-slate-950 border-slate-800" 
                      placeholder="Qtd"
                    />
                  </div>
                  <div className="col-span-3">
                    <Button 
                      onClick={addProdutoAoPedido}
                      disabled={!selectedProduto}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Lista de Itens no Carrinho */}
                <div className="bg-slate-950/50 rounded-lg border border-slate-800 p-2 min-h-[100px]">
                  {itens.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[10px] uppercase font-bold text-muted-foreground py-8">
                      Carrinho vazio
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itens.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 group">
                          <div>
                            <div className="text-[10px] font-black text-white uppercase">{item.nome}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">{item.quantidade}x R$ {item.preco_unitario.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-[11px] font-black text-primary">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</div>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.produto_id)} className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-xs font-black uppercase tracking-widest text-primary">Total do Pedido</span>
                <span className="text-xl font-black text-primary">R$ {valorTotalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => createPedidoMutation.mutate()}
                disabled={createPedidoMutation.isPending || !selectedCliente || itens.length === 0}
                className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Finalizar e Gerar Pedido
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
                placeholder="Pesquisar por cliente ou Nº pedido..." 
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
                onClick={() => exportToCSV(pedidos, 'pedidos.csv')}
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
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Nº Pedido</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Cliente</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Data</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-muted-foreground text-right">Valor Total</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest text-xs font-bold animate-pulse">
                      Carregando fluxo de pedidos...
                    </td>
                  </tr>
                ) : filteredPedidos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest text-xs font-bold">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredPedidos.map((pedido) => (
                    <tr key={pedido.id} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          <span className="text-sm font-black text-white">#{pedido.numero_pedido}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-white uppercase tracking-tight">{pedido.clientes?.nome_fantasia || "Cliente não identificado"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(pedido.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black text-primary">
                          R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-500">
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
