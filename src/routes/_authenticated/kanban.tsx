import { createFileRoute, useRouter } from "@tanstack/react-router";
import { 
  Trello, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  AlertCircle,
  Wrench,
  ClipboardCheck,
  Factory,
  CheckCircle2,
  MoreHorizontal,
  Camera,
  MessageSquare,
  ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
});

function KanbanPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: ordens = [], refetch } = useQuery({
    queryKey: ['kanban_os'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('data_abertura', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Status atualizado com sucesso");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const columns = [
    { id: "aberta", label: "Triagem", icon: ClipboardCheck, color: "slate" },
    { id: "vistoria", label: "Vistoria Técnica", icon: Wrench, color: "amber" },
    { id: "orcamento_pendente", label: "Orçamento", icon: Factory, color: "blue" },
    { id: "usinagem", label: "Usinagem / Bancada", icon: Trello, color: "indigo" },
    { id: "montagem", label: "Montagem / Teste", icon: CheckCircle2, color: "emerald" },
    { id: "pronto", label: "Pronto / Expedição", icon: CheckCircle2, color: "emerald" },
  ];

  const filteredCards = ordens.filter(os => 
    os.numero_os.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col space-y-6 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">QUADRO DE <span className="text-primary">PRODUÇÃO (KANBAN)</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Fluxo operacional em tempo real.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar OS ou equipamento..." 
              className="pl-10 h-10 border-border bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
            <Filter className="mr-2 h-4 w-4 text-primary" />
            Filtros
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {columns.map((col) => (
          <div key={col.id} className="w-80 shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${col.id === 'vistoria' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{col.label}</h3>
                <Badge variant="secondary" className="text-[9px] font-black h-5 px-2 bg-slate-100 border-border">
                  {filteredCards.filter(c => c.status === col.id).length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 bg-slate-50/50 border border-border/50 rounded-2xl p-3 space-y-3 overflow-y-auto custom-scrollbar shadow-inner">
              {filteredCards.filter(c => c.status === col.id).map((card: any) => (
                <Link key={card.id} to="/os/$id" params={{ id: card.id }}>
                  <Card className="border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group bg-white">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary group-hover:scale-110 transition-transform">{card.numero_os}</span>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-primary">Mover para</DropdownMenuLabel>
                              {columns.map(col => (
                                <DropdownMenuItem 
                                  key={col.id} 
                                  className="text-[9px] font-bold uppercase tracking-widest hover:bg-white/10"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleUpdateStatus(card.id, col.id);
                                  }}
                                >
                                  {col.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Badge className={`text-[8px] font-black uppercase tracking-widest ${
                            card.prioridade === 'Alta' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 border-none'
                          }`}>
                            {card.prioridade}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{card.cliente}</p>
                        <p className="text-sm font-black text-foreground uppercase tracking-tight leading-tight">{card.descricao || "Sem descrição"}</p>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 border border-border flex items-center justify-center text-[8px] font-bold">
                            {card.tecnico_id ? 'T' : 'N'}
                          </div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{card.tecnico_id ? 'Técnico Atribuído' : 'Sem Técnico'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600">
                          <Clock className="h-3 w-3" />
                          {Math.floor((Date.now() - new Date(card.data_abertura || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}d
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                         <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                           <Camera className="h-2.5 w-2.5" /> 4
                         </div>
                         <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                           <MessageSquare className="h-2.5 w-2.5" /> 2
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {filteredCards.filter(c => c.status === col.id).length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center text-muted-foreground opacity-20">
                  <Trello className="h-8 w-8 mb-2" />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Coluna Vazia</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const emerald = CheckCircle2;
