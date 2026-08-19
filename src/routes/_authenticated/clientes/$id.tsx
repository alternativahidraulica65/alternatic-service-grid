import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Wrench,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  Users,
  Box,
  FileText,
  DollarSign,
  History,
  TrendingUp,
  Edit,
  UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  component: ClienteDetalhesPage,
});

function ClienteDetalhesPage() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: contatos = [] } = useQuery({
    queryKey: ['cliente_contatos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_contatos')
        .select('*')
        .eq('cliente_id', id);
      if (error) throw error;
      return data;
    }
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['cliente_equipamentos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_equipamentos')
        .select('*')
        .eq('cliente_id', id);
      if (error) throw error;
      return data;
    }
  });

  const { data: financeiro = [] } = useQuery({
    queryKey: ['cliente_financeiro', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select('*')
        .eq('cliente_id', id)
        .order('data_vencimento', { ascending: false });
      if (error) throw error;
      return data;
    }
  });


  const { data: ordens = [], isLoading: isLoadingOS } = useQuery({
    queryKey: ['cliente_os', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('cliente_id', id)
        .order('data_abertura', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  if (isLoadingCliente) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando Perfil...</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="font-display text-xl font-black uppercase">Cliente não encontrado</h2>
        <Button variant="link" onClick={() => router.navigate({ to: '/clientes' })}>Voltar para listagem</Button>
      </div>
    );
  }

  const stats = {
    totalOS: ordens.length,
    osAbertas: ordens.filter(os => os.status !== 'Concluída' && os.status !== 'Cancelada').length,
    totalValor: ordens.reduce((acc, os) => acc + (os.valor_total || 0), 0)
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: '/clientes' })} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">PERFIL DO <span className="text-primary">CLIENTE</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">{cliente.nome}</p>
          </div>
        </div>
        <Button 
          onClick={() => router.navigate({ to: "/os/nova", search: { cliente_id: cliente.id } as any })}
          className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova OS para Cliente
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dados Cadastrais */}
        <Card className="lg:col-span-2 border-border shadow-sm bg-white">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Informações Cadastrais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Razão Social</p>
              <p className="text-sm font-bold uppercase">{cliente.nome}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ / CPF</p>
              <p className="text-sm font-mono font-medium">{cliente.cnpj || "Não informado"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</p>
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-slate-400" />
                <p className="text-sm font-medium">{cliente.email || "Não informado"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</p>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-slate-400" />
                <p className="text-sm font-medium">{cliente.telefone || "Não informado"}</p>
              </div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-slate-400" />
                <p className="text-sm font-medium">{cliente.endereco || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Financeiro/Operacional */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-white border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wrench className="h-5 w-5 text-primary" />
                <Badge variant="outline" className="text-[9px] font-black uppercase">Volume OS</Badge>
              </div>
              <p className="text-2xl font-black text-foreground">{stats.totalOS}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ordens de Serviço Totais</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm bg-white border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <Badge className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest">Pendentes</Badge>
              </div>
              <p className="text-2xl font-black text-foreground">{stats.osAbertas}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">OS em Execução</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de OS */}
      <Card className="border-border shadow-md overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b border-border/50 py-4">
          <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Histórico de Ordens de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Nº OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Data Abertura</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Prioridade</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Valor Total</TableHead>
                <TableHead className="py-4 pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.length > 0 ? (
                ordens.map((os) => (
                  <TableRow key={os.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                    <TableCell className="py-4 pl-6 text-sm font-black text-primary">{os.numero_os}</TableCell>
                    <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                      {os.data_abertura ? format(new Date(os.data_abertura), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={`text-[9px] font-black uppercase tracking-widest ${
                        os.status === 'Concluída' ? 'bg-emerald-500 text-white' :
                        os.status === 'Cancelada' ? 'bg-red-500 text-white' :
                        'bg-amber-500 text-white'
                      }`}>
                        {os.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${
                        os.prioridade === 'Alta' || os.prioridade === 'Urgente' ? 'text-red-500 border-red-200 bg-red-50' : ''
                      }`}>
                        {os.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-bold text-foreground">
                      {os.valor_total ? os.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "—"}
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary"
                        onClick={() => router.navigate({ to: '/kanban' })}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                    Nenhuma Ordem de Serviço registrada para este cliente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
