import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { rotuloComissao } from "@/lib/comissao";

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
  const queryClient = useQueryClient();

  const { data: vendedoresAtivos = [] } = useQuery({
    queryKey: ['vendedores_ativos'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendedores')
        .select('id, nome, apelido, tipo_comissao, percentual, valor_comissao')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const definirVendedor = async (vendedorId: string) => {
    const valor = vendedorId === 'nenhum' ? null : vendedorId;
    const { error } = await supabase
      .from('clientes')
      .update({ vendedor_id: valor } as any)
      .eq('id', id);
    if (error) {
      toast.error("Não foi possível salvar o vendedor: " + error.message);
      return;
    }
    toast.success("Vendedor responsável atualizado.");
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
  };


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
    queryKey: ['contatos_cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos_cliente' as any)
        .select('*')
        .eq('cliente_id', id);
      if (error) throw error;
      return data ?? [];
    }
  });

  // Equipamentos do cliente: derivados das OS registradas (tabela oficial).
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['cliente_equipamentos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, tipo_equipamento_id, data_abertura, tipos_equipamento (nome, categoria_principal)')
        .eq('cliente_id', id);
      if (error) throw error;
      return (data ?? []).map((o: any) => ({
        id: o.id,
        nome: o.tipos_equipamento?.nome ?? 'Equipamento não informado',
        tipo: o.tipos_equipamento?.categoria_principal ?? null,
        ultima_manutencao: o.data_abertura,
      }));
    }
  });

  // Financeiro do cliente: custos das OS oficiais.
  const { data: financeiro = [] } = useQuery({
    queryKey: ['cliente_financeiro', id],
    queryFn: async () => {
      const { data: oss, error: ossError } = await supabase
        .from('ordens_servico')
        .select('id')
        .eq('cliente_id', id);
      if (ossError) throw ossError;
      const ids = (oss ?? []).map((o: any) => Number(o.id));
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('os_custos' as any)
        .select('*')
        .in('os_id', ids);
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: orcamentos = [] } = useQuery({
    queryKey: ['cliente_orcamentos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, status, valor_final, data_entrada')
        .eq('cliente_id', id)
        .order('data_entrada', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: historico = [] } = useQuery({
    queryKey: ['cliente_historico', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_status_os' as any)
        .select('*, ordens_servico!inner(cliente_id)')
        .eq('ordens_servico.cliente_id', id)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });



  const { data: ordens = [], isLoading: isLoadingOS } = useQuery({
    queryKey: ['cliente_os', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('cliente_id', id)
        .order('data_entrada', { ascending: false });
      if (error) throw error;
      return data ?? [];
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
    totalValor: ordens.reduce((acc, os) => acc + Number((os as any).valor_final || 0), 0)
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
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 font-black uppercase tracking-widest text-xs px-6">
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button 
            onClick={() => router.navigate({ to: "/os/nova", search: { cliente_id: cliente.id } as any })}
            className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        </div>
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-8 mb-8 overflow-x-auto overflow-y-hidden custom-scrollbar">
          {["Resumo", "Dados Cadastrais", "Contatos", "Equipamentos", "OS", "Orçamentos", "Financeiro", "Histórico"].map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab.toLowerCase().replace(" ", "-")} 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none font-bold uppercase text-[10px] tracking-widest px-0 h-12 transition-all"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo">
           <div className="grid gap-6 md:grid-cols-4">
             <Card className="border-border shadow-sm bg-white border-l-4 border-l-primary">
               <CardContent className="pt-6">
                 <div className="flex items-center justify-between mb-2">
                   <Wrench className="h-5 w-5 text-primary" />
                   <Badge variant="outline" className="text-[9px] font-black uppercase">Volume</Badge>
                 </div>
                 <p className="text-2xl font-black text-foreground">{stats.totalOS}</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ordens de Serviço</p>
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
             <Card className="border-border shadow-sm bg-white border-l-4 border-l-emerald-500">
               <CardContent className="pt-6">
                 <div className="flex items-center justify-between mb-2">
                   <DollarSign className="h-5 w-5 text-emerald-500" />
                   <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Faturado</Badge>
                 </div>
                 <p className="text-2xl font-black text-foreground">{stats.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Faturamento Acumulado</p>
               </CardContent>
             </Card>
             <Card className="border-border shadow-sm bg-white border-l-4 border-l-blue-500">
               <CardContent className="pt-6">
                 <div className="flex items-center justify-between mb-2">
                   <Box className="h-5 w-5 text-blue-500" />
                   <Badge className="bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest">Inventário</Badge>
                 </div>
                 <p className="text-2xl font-black text-foreground">{equipamentos.length}</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Equipamentos Cadastrados</p>
               </CardContent>
             </Card>
           </div>
        </TabsContent>

        <TabsContent value="dados-cadastrais">
           <Card className="border-border shadow-sm bg-white">
             <CardHeader>
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
                  <p className="text-sm font-medium">{cliente.email || "Não informado"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{cliente.telefone || "Não informado"}</p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço</p>
                  <p className="text-sm font-medium">{cliente.endereco || "Não informado"}</p>
                </div>
                <div className="md:col-span-2 space-y-2 pt-4 border-t border-dashed border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendedor responsável</p>
                  <Select
                    value={(cliente as any).vendedor_id || 'nenhum'}
                    onValueChange={definirVendedor}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Sem vendedor</SelectItem>
                      {vendedoresAtivos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.apelido || v.nome} — {rotuloComissao(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    A comissão dos orçamentos deste cliente segue a regra cadastrada para o vendedor.
                  </p>
                </div>

             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="contatos">
           <Card className="border-border shadow-sm bg-white">
              <CardContent className="p-6">
                 {contatos.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                       {contatos.map(c => (
                         <div key={c.id} className="p-4 rounded-lg border border-border flex items-center justify-between bg-slate-50/50">
                           <div>
                             <p className="font-bold uppercase text-xs">{c.nome}</p>
                             <p className="text-[10px] text-muted-foreground">{c.cargo}</p>
                           </div>
                           <div className="text-[10px] font-mono text-muted-foreground">{c.telefone}</div>
                         </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs uppercase italic">Nenhum contato cadastrado.</div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="equipamentos">
           <Card className="border-border shadow-sm bg-white">
              <CardContent className="p-6">
                 {equipamentos.length > 0 ? (
                   <Table>
                     <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Equipamento</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipo</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Modelo</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {equipamentos.map((e: any) => (
                           <TableRow key={e.id}>
                             <TableCell className="font-bold text-xs">{e.nome}</TableCell>
                             <TableCell className="text-xs">{e.tipo}</TableCell>
                             <TableCell className="text-xs font-mono">{e.tipo ?? '—'}</TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                   </Table>
                 ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs uppercase italic">Nenhum equipamento registrado.</div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="os">
           <Card className="border-border shadow-sm bg-white">
              <CardContent className="p-0">
                  <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Nº OS</TableHead>
                         <TableHead className="text-[10px] font-black uppercase tracking-widest">Data</TableHead>
                         <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                        {ordens.map(os => (
                          <TableRow key={os.id}>
                            <TableCell className="pl-6 font-bold text-primary">
                              <Link
                                to="/os/$id"
                                params={{ id: os.id }}
                                className="hover:underline hover:text-primary/80"
                              >
                                {os.numero_os}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs">{os.data_abertura ? format(new Date(os.data_abertura), "dd/MM/yyyy") : "—"}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[9px] uppercase">{os.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                  </Table>
              </CardContent>
           </Card>
        </TabsContent>
        
        <TabsContent value="orçamentos">
           <Card className="border-border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                 {orcamentos.length > 0 ? (
                    <Table>
                       <TableHeader className="bg-slate-50">
                          <TableRow>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Nº Orçamento</TableHead>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest">Data</TableHead>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest">Valor</TableHead>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {orcamentos.map((o: any) => (
                             <TableRow key={o.id}>
                                <TableCell className="pl-6 font-bold text-primary">{`#${o.id}`}</TableCell>
                                <TableCell className="text-xs">{o.data_abertura ? format(new Date(o.data_entrada), "dd/MM/yyyy") : "—"}</TableCell>
                                <TableCell className="text-xs font-bold">{Number(o.valor_final ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[9px] uppercase">{o.status}</Badge></TableCell>
                             </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs uppercase italic">Nenhum orçamento encontrado.</div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="financeiro">
           <Card className="border-border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                 {financeiro.length > 0 ? (
                    <Table>
                       <TableHeader className="bg-slate-50">
                          <TableRow>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Descrição</TableHead>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest">Vencimento</TableHead>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest">Valor</TableHead>
                             <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipo</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {financeiro.map((f: any) => (
                             <TableRow key={f.id}>
                                <TableCell className="pl-6 text-xs font-bold uppercase">{f.descricao}</TableCell>
                                <TableCell className="text-xs">{f.criado_em ? format(new Date(f.criado_em), "dd/MM/yyyy") : "—"}</TableCell>
                                <TableCell className={`text-xs font-black ${f.categoria === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                                   {Number(f.valor_total_custo ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell><Badge className="text-[9px] uppercase">{f.categoria ?? '—'}</Badge></TableCell>
                             </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs uppercase italic">Nenhum lançamento financeiro.</div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="histórico">
           <Card className="border-border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                 {historico.length > 0 ? (
                    <div className="divide-y divide-border">
                       {historico.map(h => (
                          <div key={h.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                   <History className="h-4 w-4 text-slate-400" />
                                </div>
                                <div>
                                   <p className="text-xs font-bold uppercase">{h.acao}</p>
                                   <p className="text-[10px] text-muted-foreground uppercase">{h.tabela}</p>
                                   <p className="text-[10px] font-bold text-primary lowercase">{(h as any).executor_email || "usuário não identificado"}</p>

                                </div>
                             </div>
                             <div className="text-[10px] font-medium text-muted-foreground">
                                {h.criado_em ? format(new Date(h.criado_em), "dd/MM/yyyy HH:mm") : "—"}
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs uppercase italic">Nenhum histórico registrado.</div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>


      </Tabs>
    </div>
  );

}
