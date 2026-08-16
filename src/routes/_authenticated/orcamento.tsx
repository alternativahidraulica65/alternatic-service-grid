import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft,
  DollarSign,
  Plus,
  Trash2,
  Save,
  TrendingUp,
  Package,
  UserCheck,
  Eye,
  ShieldCheck,
  Calculator,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

export const Route = createFileRoute("/_authenticated/orcamento")({
  component: OrcamentoPage,
  head: () => ({
    meta: [
      { title: "Orçamentação — Alternativa Hidráulica" },
      { name: "description", content: "Levantamento de custos e formação de preços de OS." },
    ],
  }),
});

type ItemCusto = {
  id?: string;
  descricao: string;
  categoria: string;
  custo_interno: number;
  valor_venda: number;
  terceiro_nome?: string;
  is_terceirizado: boolean;
};

function OrcamentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAdmin, roles } = Route.useRouteContext();
  
  // RBAC Override
  const [activeView, setActiveView] = useState<string | null>(null);
  useEffect(() => {
    if (isAdmin && !activeView) setActiveView("diretor");
    else if (!isAdmin) setActiveView(roles[0] || "operador");
  }, [isAdmin, roles]);

  const [selectedOSId, setSelectedOSId] = useState<string>("");
  const [items, setItems] = useState<ItemCusto[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states for new item
  const [newItem, setNewItem] = useState<ItemCusto>({
    descricao: "",
    categoria: "Vedação",
    custo_interno: 0,
    valor_venda: 0,
    is_terceirizado: false
  });

  // Queries
  const { data: allOrders } = useSuspenseQuery({
    queryKey: ['ordens_servico_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, cliente, descricao, status')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const selectedOS = allOrders?.find(os => os.id === selectedOSId);

  // Fetch costs for selected OS
  useEffect(() => {
    if (selectedOSId) {
      const fetchCosts = async () => {
        const { data, error } = await supabase
          .from('custos_os')
          .select('*')
          .eq('os_id', selectedOSId);
        if (error) {
          toast.error("Erro ao carregar custos");
        } else {
          setItems(data || []);
        }
      };
      fetchCosts();
    }
  }, [selectedOSId]);

  const addItem = () => {
    if (!newItem.descricao || newItem.custo_interno <= 0) {
      toast.error("Preencha a descrição e o custo corretamente");
      return;
    }
    setItems([...items, { ...newItem, id: Math.random().toString(36).substr(2, 9) }]);
    setNewItem({
      descricao: "",
      categoria: "Vedação",
      custo_interno: 0,
      valor_venda: 0,
      is_terceirizado: false
    });
    toast.success("Item adicionado à lista temporária");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const totalCusto = items.reduce((acc, curr) => acc + Number(curr.custo_interno), 0);
  const totalVenda = items.reduce((acc, curr) => acc + Number(curr.valor_venda), 0);
  const margemBruta = totalVenda - totalCusto;
  const margemPercentual = totalVenda > 0 ? (margemBruta / totalVenda) * 100 : 0;

  const chartData = [
    { name: 'Custo Total', valor: totalCusto, fill: '#64748b' },
    { name: 'Valor Venda', valor: totalVenda, fill: '#FFD700' },
    { name: 'Lucro Líquido', valor: margemBruta, fill: '#10b981' },
  ];

  const handleSave = async () => {
    if (!selectedOSId) {
      toast.error("Selecione uma Ordem de Serviço");
      return;
    }
    setLoading(true);
    try {
      // Deletar custos antigos e inserir novos (simplificação para este exemplo)
      await supabase.from('custos_os').delete().eq('os_id', selectedOSId);
      
      const toInsert = items.map(({ id, ...rest }) => ({
        ...rest,
        os_id: selectedOSId,
        criado_por: user.id
      }));

      const { error } = await supabase.from('custos_os').insert(toInsert);
      
      if (error) throw error;

      // Atualizar valor total na OS
      await supabase.from('ordens_servico')
        .update({ valor_total: totalVenda, margem_lucro: margemPercentual })
        .eq('id', selectedOSId);

      toast.success("Orçamento salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOSId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('ordens_servico')
        .update({ status: 'aguardando_aprovacao' })
        .eq('id', selectedOSId);
      if (error) throw error;
      toast.success("OS enviada para aprovação do cliente!");
      router.navigate({ to: '/dashboard' });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const ViewSwitcher = () => {
    if (!isAdmin) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/5 mr-2">
            <Eye className="mr-2 h-4 w-4" />
            Visão: {activeView?.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Simulador RBAC
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveView("diretor")}>Diretor</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("financeiro")}>Financeiro</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("gestor")}>Gestor</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveView("operador")}>Operador</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display text-lg font-bold text-foreground">Orçamentação e Custos</h1>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher />
            <Button 
              variant="default" 
              className="btn-industrial" 
              onClick={handleSave}
              disabled={loading || !selectedOSId}
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Orçamento
            </Button>
          </div>
        </div>
      </header>

      <main className="container-industrial py-8 space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Seleção de OS e Resumo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Dados da OS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Selecionar Ordem de Serviço</Label>
                  <Select value={selectedOSId} onValueChange={setSelectedOSId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma OS ativa" />
                    </SelectTrigger>
                    <SelectContent>
                      {allOrders?.map(os => (
                        <SelectItem key={os.id} value={os.id}>
                          {os.numero_os} - {os.cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedOS && (
                  <div className="rounded-lg bg-muted/30 p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-bold">{selectedOS.cliente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equipamento:</span>
                      <span className="font-bold">{selectedOS.descricao}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status Atual:</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{selectedOS.status}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Custo Total:</span>
                    <span className="text-lg font-bold text-slate-700">R$ {totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor de Venda:</span>
                    <span className="text-lg font-bold text-primary">R$ {totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Margem Bruta:</span>
                    <span className="text-xl font-bold text-emerald-600">R$ {margemBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Percentual:</span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{margemPercentual.toFixed(1)}%</Badge>
                  </div>
                </div>

                <div className="h-[200px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" hide />
                      <Tooltip 
                        formatter={(val: any) => `R$ ${val.toLocaleString('pt-BR')}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={handleApprove}
                  disabled={!selectedOSId || items.length === 0}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Enviar p/ Aprovação Cliente
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Lançamento de Itens */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Levantamento de Custos</CardTitle>
                  <CardDescription>Adicione itens internos ou serviços de terceiros</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={newItem.is_terceirizado ? "outline" : "default"}
                    size="sm"
                    onClick={() => setNewItem({...newItem, is_terceirizado: false, terceiro_nome: ""})}
                    className={!newItem.is_terceirizado ? "bg-primary text-primary-foreground" : ""}
                  >
                    Custo Interno
                  </Button>
                  <Button 
                    variant={newItem.is_terceirizado ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewItem({...newItem, is_terceirizado: true, categoria: "Terceiro"})}
                    className={newItem.is_terceirizado ? "bg-slate-700 text-white hover:bg-slate-800" : ""}
                  >
                    Lançar Serviço Terceiro
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  {newItem.is_terceirizado ? (
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Nome do Terceiro (ex: Thiago Hidráulica)</Label>
                      <Input 
                        placeholder="Nome da empresa parceira" 
                        value={newItem.terceiro_nome || ""}
                        onChange={e => setNewItem({...newItem, terceiro_nome: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-1 space-y-2">
                      <Label>Categoria</Label>
                      <Select 
                        value={newItem.categoria} 
                        onValueChange={val => setNewItem({...newItem, categoria: val})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vedação">Vedação</SelectItem>
                          <SelectItem value="Matéria-Prima">Matéria-Prima</SelectItem>
                          <SelectItem value="Usinagem">Usinagem</SelectItem>
                          <SelectItem value="Pintura">Pintura</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className={newItem.is_terceirizado ? "sm:col-span-2 space-y-2" : "sm:col-span-3 space-y-2"}>
                    <Label>Descrição do Escopo / Item</Label>
                    <Input 
                      placeholder="Ex: Jogo de Gaxetas 3.5 polegadas" 
                      value={newItem.descricao}
                      onChange={e => setNewItem({...newItem, descricao: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Custo (Para Nós)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        placeholder="0.00"
                        value={newItem.custo_interno || ""}
                        onChange={e => setNewItem({...newItem, custo_interno: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor Venda (Cliente)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        placeholder="0.00"
                        value={newItem.valor_venda || ""}
                        onChange={e => setNewItem({...newItem, valor_venda: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <Button className="w-full btn-industrial" onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </div>
                </div>

                <div className="mt-8 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Item/Categoria</th>
                        <th className="px-4 py-3 text-right font-medium">Custo Int.</th>
                        <th className="px-4 py-3 text-right font-medium">Venda Cli.</th>
                        <th className="px-4 py-3 text-right font-medium">Margem</th>
                        <th className="px-4 py-3 text-center font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map(item => (
                        <tr key={item.id} className={item.is_terceirizado ? "bg-slate-50/50" : ""}>
                          <td className="px-4 py-3">
                            <div className="font-bold">{item.descricao}</div>
                            <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                              {item.is_terceirizado ? (
                                <>
                                  <Badge className="h-4 text-[8px] bg-slate-700">TERCEIRO</Badge>
                                  {item.terceiro_nome}
                                </>
                              ) : (
                                item.categoria
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            R$ {Number(item.custo_interno).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary">
                            R$ {Number(item.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                            {((Number(item.valor_venda) - Number(item.custo_interno)) / Number(item.valor_venda) * 100).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="sm" onClick={() => removeItem(item.id!)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                            Nenhum custo lançado para esta OS.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>
                <strong>Nota Técnica:</strong> Os valores de venda aqui lançados serão consolidados no orçamento final enviado ao cliente. 
                A margem de lucro sugerida para cilindros é de 35% sobre o custo interno bruto.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
