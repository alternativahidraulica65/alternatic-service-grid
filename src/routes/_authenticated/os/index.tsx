import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { 
  Search, 
  Filter, 
  Plus, 
  Wrench,
  ArrowLeft,
  LayoutDashboard,
  MoreVertical,
  Eye,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/")({
  component: OSListPage,
});

function OSListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['os_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes (nome)
        `)
        .order('numero_os', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const deleteOS = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem de Serviço excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ['os_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir OS: " + error.message);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta': return <Badge className="bg-slate-100 text-slate-700 border-slate-200 uppercase text-[9px] font-black tracking-widest">Triagem</Badge>;
      case 'vistoria': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black tracking-widest">Vistoria</Badge>;
      case 'orcamento_pendente': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[9px] font-black tracking-widest">Orçamento</Badge>;
      case 'aprovada': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black tracking-widest">Aprovada</Badge>;
      case 'usinagem': return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 uppercase text-[9px] font-black tracking-widest">Usinagem</Badge>;
      case 'montagem': return <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 uppercase text-[9px] font-black tracking-widest">Montagem</Badge>;
      case 'pronto': return <Badge className="bg-emerald-500 text-white border-none uppercase text-[9px] font-black tracking-widest">Pronto</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest">{status}</Badge>;
    }
  };

  const filteredOS = ordens.filter(os => 
    os.numero_os.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (os.clientes as any)?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: '/dashboard' })} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">GESTÃO DE <span className="text-primary">ORDENS DE SERVIÇO</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Controle operacional centralizado.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.navigate({ to: "/kanban" })}
            className="h-11 font-black uppercase tracking-widest text-xs px-6 border-primary/20 text-primary hover:bg-primary/5"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Ver Kanban
          </Button>
          <Button 
            onClick={() => router.navigate({ to: "/os/nova" })}
            className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar por Nº OS, Cliente ou Equipamento..." 
            className="pl-10 h-12 border-border bg-white shadow-sm font-medium" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-12 border-border font-bold uppercase text-[10px] tracking-widest px-6 shrink-0 bg-white">
          <Filter className="mr-2 h-4 w-4 text-primary" />
          Filtros Avançados
        </Button>
      </div>

      <Card className="border-border shadow-xl bg-white overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-900 text-white">
              <TableRow className="hover:bg-slate-900 border-none">
                <TableHead className="text-[10px] font-black uppercase tracking-widest pl-8 text-white/70 h-14">Nº OS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/70 h-14">Cliente</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/70 h-14">Equipamento / Descrição</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/70 h-14">Abertura</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/70 h-14">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/70 h-14 pr-8 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={6} className="h-16 bg-slate-50/50"></TableCell>
                  </TableRow>
                ))
              ) : filteredOS.length > 0 ? (
                filteredOS.map((os) => (
                  <TableRow 
                    key={os.id} 
                    className="hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer"
                    onClick={() => router.navigate({ to: "/os/$id", params: { id: os.id } })}
                  >
                    <TableCell className="pl-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-primary tracking-tight">{os.numero_os}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID: {os.id.substring(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold uppercase text-slate-700 hover:text-primary transition-colors">{(os.clientes as any)?.nome || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px] truncate">
                        <span className="text-xs font-medium text-slate-600 italic">{os.descricao || 'Sem descrição'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-xs font-mono text-slate-500">
                          {os.data_abertura ? format(new Date(os.data_abertura), "dd/MM/yyyy") : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(os.status)}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-slate-900 text-white border-white/10">
                          <DropdownMenuItem 
                            onClick={() => router.navigate({ to: "/os/$id", params: { id: os.id } })}
                            className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 text-primary" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                            onClick={() => router.navigate({ to: "/os/$id/orcamento", params: { id: os.id } } as any)}
                          >
                            <Plus className="mr-2 h-3.5 w-3.5 text-blue-400" />
                            Gerar Orçamento
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteOS.mutate(os.id)}
                            className="text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 cursor-pointer text-red-400"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Excluir OS
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic text-xs uppercase tracking-widest">
                    Nenhuma Ordem de Serviço encontrada.
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
