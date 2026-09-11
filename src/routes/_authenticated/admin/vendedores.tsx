import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, 
  TrendingUp, 
  PieChart, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  AlertCircle,
  FileDown
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Vendedor = Database['public']['Tables']['vendedores']['Row'] & {
  vendedor_empresas: {
    empresa_id: string;
    empresas_emissoras: {
      id: string;
      nome: string;
    };
  }[];
};

const vendedorSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  regra_comissao: z.enum(["percentual_bruto", "lucro_liquido"]),
  tipo_calculo: z.enum(["percentual", "divisao_custos"]),
  percentual: z.number().min(0).max(100),
  observacao: z.string().optional(),
  empresas_ids: z.array(z.string()).min(1, "Selecione pelo menos uma empresa"),
});

type VendedorFormValues = z.infer<typeof vendedorSchema>;

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  beforeLoad: ({ context, location }) => {
    const { roles, profile, isDiretor, isFinanceiro } = context as any;
    const cargo = profile?.cargo || "";
    const temPermissao =
      isDiretor ||
      isFinanceiro ||
      cargo === "diretor" ||
      cargo === "administrativo_financeiro" ||
      (roles as string[]).includes("diretor") ||
      (roles as string[]).includes("administrativo_financeiro");
    if (!temPermissao) {
      throw redirect({ to: "/dashboard", search: { redirect: location.href } });
    }
  },
  component: VendedoresPage,
});

function VendedoresPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegra, setFilterRegra] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);

  // Queries
  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendedores")
        .select(`
          *,
          vendedor_empresas (
            empresa_id,
            empresas_emissoras (
              id,
              nome
            )
          )
        `)
        .order("nome");
      
      if (error) {
        console.error("Vendedores fetch error:", error);
        return [];
      }
      return (data as any) as Vendedor[];
    },
  });

  const { data: empresas } = useQuery({
    queryKey: ["empresas_emissoras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas_emissoras").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: VendedorFormValues) => {
      const { empresas_ids, observacao, ...vendedorData } = values;
      
      const { data: vendedor, error: vError } = await supabase
        .from("vendedores")
        .insert([{
          ...vendedorData,
          observacao: observacao || null
        }])
        .select()
        .single();
      
      if (vError) throw vError;

      const junctionData = empresas_ids.map(empId => ({
        vendedor_id: vendedor.id,
        empresa_id: empId
      }));

      const { error: jError } = await supabase
        .from("vendedor_empresas")
        .insert(junctionData);
      
      if (jError) throw jError;
      return vendedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
      toast.success("Vendedor cadastrado com sucesso!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: VendedorFormValues }) => {
      const { empresas_ids, observacao, ...vendedorData } = values;
      
      const { error: vError } = await supabase
        .from("vendedores")
        .update({
          ...vendedorData,
          observacao: observacao || null
        })
        .eq("id", id);
      
      if (vError) throw vError;

      // Atualizar empresas (Delete + Insert simplificado)
      await supabase.from("vendedor_empresas").delete().eq("vendedor_id", id);
      
      const junctionData = empresas_ids.map(empId => ({
        vendedor_id: id,
        empresa_id: empId
      }));

      const { error: jError } = await supabase
        .from("vendedor_empresas")
        .insert(junctionData);
      
      if (jError) throw jError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
      toast.success("Vendedor atualizado com sucesso!");
      setIsModalOpen(false);
      setEditingVendedor(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
      toast.success("Vendedor removido.");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    }
  });

  // Form setup
  const form = useForm<VendedorFormValues>({
    resolver: zodResolver(vendedorSchema),
    defaultValues: {
      nome: "",
      regra_comissao: "percentual_bruto",
      tipo_calculo: "percentual",
      percentual: 0,
      observacao: "",
      empresas_ids: [],
    },
  });

  const onSubmit = (values: VendedorFormValues) => {
    if (editingVendedor) {
      updateMutation.mutate({ id: editingVendedor.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    form.reset({
      nome: vendedor.nome,
      regra_comissao: vendedor.regra_comissao,
      tipo_calculo: vendedor.tipo_calculo,
      percentual: Number(vendedor.percentual),
      observacao: vendedor.observacao || "",
      empresas_ids: vendedor.vendedor_empresas.map(ve => ve.empresa_id),
    });
    setIsModalOpen(true);
  };

  const filteredVendedores = useMemo(() => {
    if (!vendedores) return [];
    return vendedores.filter(v => {
      const matchesSearch = v.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegra = filterRegra === "all" || v.regra_comissao === filterRegra;
      return matchesSearch && matchesRegra;
    });
  }, [vendedores, searchTerm, filterRegra]);

  const kpis = useMemo(() => {
    if (!vendedores) return { total: 0, bruto: 0, liquido: 0 };
    return {
      total: vendedores.length,
      bruto: vendedores.filter(v => v.regra_comissao === 'percentual_bruto').length,
      liquido: vendedores.filter(v => v.regra_comissao === 'lucro_liquido').length,
    };
  }, [vendedores]);

  return (
    <div className="container-industrial py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">
            Gestão de Vendedores & Comissões
          </h1>
          <p className="text-slate-500 font-medium">
            Gerencie cadastro de vendedores, regras de comissão e empresas vinculadas.
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingVendedor(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="btn-industrial bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Novo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-xl uppercase tracking-wider text-slate-900">
                {editingVendedor ? 'Editar Vendedor' : 'Cadastro de Vendedor'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Ana Beatriz Costa" {...field} className="bg-slate-50 border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="regra_comissao"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Regra de Comissão</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentual_bruto">Percentual Bruto</SelectItem>
                            <SelectItem value="lucro_liquido">Lucro Líquido</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo_calculo"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tipo de Cálculo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentual">Percentual</SelectItem>
                            <SelectItem value="divisao_custos">Divisão de Custos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="percentual"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Percentual (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0,00" 
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))}
                              className="bg-slate-50 border-slate-200 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Observação (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalhes adicionais..." {...field} className="bg-slate-50 border-slate-200 resize-none h-20" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="empresas_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Empresas Vinculadas</FormLabel>
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50 max-h-40 overflow-y-auto">
                        {empresas?.map(empresa => (
                          <div key={empresa.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`emp-${empresa.id}`}
                              checked={field.value.includes(empresa.id)}
                              onCheckedChange={(checked) => {
                                const newValue = checked 
                                  ? [...field.value, empresa.id]
                                  : field.value.filter(id => id !== empresa.id);
                                field.onChange(newValue);
                              }}
                            />
                            <label htmlFor={`emp-${empresa.id}`} className="text-xs font-medium text-slate-700 leading-none cursor-pointer">
                              {empresa.nome}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4 gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" className="font-bold uppercase tracking-widest text-xs">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-industrial bg-slate-900 text-white font-bold uppercase tracking-widest text-xs">
                    {editingVendedor ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vendedores Ativos</p>
                <p className="text-3xl font-display font-black text-slate-900">{kpis.total}</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Modelo Percentual Bruto</p>
                <p className="text-3xl font-display font-black text-slate-900">{kpis.bruto}</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(kpis.bruto/kpis.total)*100 || 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lucro Líquido / Divisão</p>
                <p className="text-3xl font-display font-black text-slate-900">{kpis.liquido}</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(kpis.liquido/kpis.total)*100 || 0}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nome do vendedor..." 
                className="pl-10 bg-white border-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterRegra} onValueChange={setFilterRegra}>
                <SelectTrigger className="w-[200px] bg-white border-slate-200">
                  <Filter className="mr-2 h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Regra de comissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Regras</SelectItem>
                  <SelectItem value="percentual_bruto">Percentual Bruto</SelectItem>
                  <SelectItem value="lucro_liquido">Lucro Líquido</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-slate-200">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-[250px] text-[10px] font-bold uppercase tracking-widest text-slate-500">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Regra de Comissão</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tipo de Cálculo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Percentual</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Empresas Vinculadas</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Observação</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-500 px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-400 font-medium">
                    Carregando vendedores...
                  </TableCell>
                </TableRow>
              ) : filteredVendedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-400 font-medium">
                    Nenhum vendedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendedores.map((vendedor) => (
                  <TableRow key={vendedor.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-slate-900">{vendedor.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[9px] ${vendedor.regra_comissao === 'percentual_bruto' ? 'border-primary/30 text-primary' : 'border-emerald-200 text-emerald-600'}`}>
                        {vendedor.regra_comissao === 'percentual_bruto' ? 'Percentual Bruto' : 'Lucro Líquido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {vendedor.tipo_calculo === 'percentual' ? 'Percentual' : 'Divisão de Custos'}
                    </TableCell>
                    <TableCell className="font-display font-black text-slate-900">
                      {vendedor.percentual}%
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendedor.vendedor_empresas.slice(0, 2).map((ve: any) => (
                          <Badge key={ve.empresa_id} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] uppercase font-bold">
                            {ve.empresas_emissoras.nome}
                          </Badge>
                        ))}
                        {vendedor.vendedor_empresas.length > 2 && (
                          <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-none text-[9px] uppercase font-bold">
                            +{vendedor.vendedor_empresas.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-slate-400 italic">
                      {vendedor.observacao || "—"}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-slate-200 shadow-xl">
                          <DropdownMenuItem onClick={() => handleEdit(vendedor)} className="text-xs font-bold uppercase tracking-widest py-2 cursor-pointer">
                            <Edit className="mr-2 h-3 w-3" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir ${vendedor.nome}?`)) {
                                deleteMutation.mutate(vendedor.id);
                              }
                            }}
                            className="text-xs font-bold uppercase tracking-widest py-2 text-red-500 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
        <AlertCircle className="h-3 w-3" />
        Regras de comissão são aplicadas automaticamente no fechamento financeiro da OS.
      </div>
    </div>
  );
}
