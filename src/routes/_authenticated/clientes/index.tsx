import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  TrendingUp,
  History,
  AlertCircle,
  Trash2,
  ArrowLeft,
  Download,
  Check,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/clientes/")({
  component: ClientesPage,
});

function ClientesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  
  const [formValues, setFormValues] = useState({
    nome: "",
    cnpj: "",
    endereco: "",
    email: "",
    telefone: ""
  });

  const { data: clientes = [] } = useSuspenseQuery({
    queryKey: ['clientes_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof formValues) => {
      if (!values.nome.trim()) throw new Error("O nome é obrigatório");
      
      const { error } = await supabase.from('clientes').insert([{
        nome: values.nome,
        cnpj: values.cnpj,
        endereco: values.endereco,
        email: values.email,
        telefone: values.telefone
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      setIsDialogOpen(false);
      setFormValues({ nome: "", cnpj: "", endereco: "", email: "", telefone: "" });
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar cliente: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof formValues & { id: string }) => {
      if (!values.nome.trim()) throw new Error("O nome é obrigatório");
      
      const { error } = await supabase.from('clientes').update({
        nome: values.nome,
        cnpj: values.cnpj,
        endereco: values.endereco,
        email: values.email,
        telefone: values.telefone
      }).eq('id', values.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedCliente(null);
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    }
  });

  const filteredClientes = clientes.filter((c: any) => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: clientes.length,
    premium: 0,
    inativos: 0,
    novos: clientes.filter((c: any) => {
      const createdDate = new Date(c.criado_em || '');
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
    }).length
  };

  const handleEdit = (cliente: any) => {
    setSelectedCliente(cliente);
    setFormValues({
      nome: cliente.nome || "",
      cnpj: cliente.cnpj || "",
      endereco: cliente.endereco || "",
      email: cliente.email || "",
      telefone: cliente.telefone || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (cliente: any) => {
    toast.error("Remoção confirmada", {
      description: `Deseja remover ${cliente.nome}?`,
      action: {
        label: "Remover",
        onClick: () => deleteMutation.mutate(cliente.id)
      }
    });
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">GESTÃO DE <span className="text-primary">CLIENTES</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Base de dados unificada e histórico comercial.</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">CADASTRAR <span className="text-primary">NOVO CLIENTE</span></DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Razão Social / Nome Fantasia</Label>
                <Input 
                  id="nome" 
                  value={formValues.nome} 
                  onChange={(e) => setFormValues({...formValues, nome: e.target.value})}
                  className="h-11 border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnpj" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ / CPF</Label>
                <Input 
                  id="cnpj" 
                  value={formValues.cnpj} 
                  onChange={(e) => setFormValues({...formValues, cnpj: e.target.value})}
                  className="h-11 border-border font-mono"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endereco" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço Completo</Label>
                <Input 
                  id="endereco" 
                  value={formValues.endereco} 
                  onChange={(e) => setFormValues({...formValues, endereco: e.target.value})}
                  className="h-11 border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                  <Input 
                    id="email" 
                    value={formValues.email} 
                    onChange={(e) => setFormValues({...formValues, email: e.target.value})}
                    className="h-11 border-border"
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                  <Input 
                    id="telefone" 
                    value={formValues.telefone} 
                    onChange={(e) => setFormValues({...formValues, telefone: e.target.value})}
                    className="h-11 border-border"
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="h-11 font-bold uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => createMutation.mutate(formValues)}
                disabled={createMutation.isPending || !formValues.nome}
                className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-8"
              >
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Confirmar Cadastro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <Badge variant="outline" className="text-[9px] font-black uppercase">Total</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.total}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clientes Cadastrados</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Curva A</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.premium}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clientes Premium</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <History className="h-5 w-5 text-amber-500" />
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Inativos</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.inativos}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem OS (90 dias)</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest">Prospecção</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.novos}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Novos este mês</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, CNPJ ou cidade..." 
                className="pl-10 h-10 border-border bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
                <Filter className="mr-2 h-4 w-4 text-primary" />
                Filtros
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => exportToCSV(clientes, 'clientes.csv')}
                className="h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Cliente / Razão Social</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">CNPJ</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Cat.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Cidade/UF</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Última OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Status</TableHead>
                <TableHead className="py-4 pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente: any) => (
                <TableRow key={cliente.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                        <Building2 className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">{cliente.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[8px] font-bold h-4">Contrato Ativo</Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[11px] font-mono text-muted-foreground">{cliente.cnpj}</TableCell>
                  <TableCell className="py-4 text-center">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black border ${
                      cliente.categoria === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      cliente.categoria === 'B' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {cliente.categoria}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                      <MapPin className="h-3 w-3 text-primary" />
                      {cliente.endereco?.split(',')[0] || "Não informado"}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-xs font-bold text-foreground">{cliente.ultimaOS || "N/A"}</TableCell>
                  <TableCell className="py-4 text-center">
                    <Badge className={`text-[9px] font-black uppercase tracking-widest ${
                      cliente.status === 'Inativo' ? 'bg-slate-400 text-white' : 'bg-emerald-500 text-white'
                    }`}>{cliente.status || 'Ativo'}</Badge>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                        <DropdownMenuItem 
                          className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                          onClick={() => handleEdit(cliente)}
                        >
                          Editar Cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Ver Perfil</DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Nova OS</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 text-red-400 cursor-pointer"
                          onClick={() => handleDelete(cliente)}
                        >
                          Remover Cliente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">EDITAR <span className="text-primary">CLIENTE</span></DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Razão Social / Nome Fantasia</Label>
              <Input 
                id="edit-nome" 
                value={formValues.nome} 
                onChange={(e) => setFormValues({...formValues, nome: e.target.value})}
                className="h-11 border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-cnpj" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ / CPF</Label>
              <Input 
                id="edit-cnpj" 
                value={formValues.cnpj} 
                onChange={(e) => setFormValues({...formValues, cnpj: e.target.value})}
                className="h-11 border-border font-mono"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endereco" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço Completo</Label>
              <Input 
                id="edit-endereco" 
                value={formValues.endereco} 
                onChange={(e) => setFormValues({...formValues, endereco: e.target.value})}
                className="h-11 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                <Input 
                  id="edit-email" 
                  value={formValues.email} 
                  onChange={(e) => setFormValues({...formValues, email: e.target.value})}
                  className="h-11 border-border"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-telefone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                <Input 
                  id="edit-telefone" 
                  value={formValues.telefone} 
                  onChange={(e) => setFormValues({...formValues, telefone: e.target.value})}
                  className="h-11 border-border"
                  placeholder="(00) 0000-0000"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className="h-11 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => updateMutation.mutate({ ...formValues, id: selectedCliente?.id })}
              disabled={updateMutation.isPending || !formValues.nome}
              className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-8"
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
