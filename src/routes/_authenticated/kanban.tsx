import { createFileRoute } from "@tanstack/react-router";
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
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { getExecutorEmail } from "@/lib/log-executor";
import {
  avaliarFluxo,
  colunaDoStatus,
  faseDoStatus,
  indiceFase,
  podeAvancar,
  ROTULO_FASE,
  type Fase,
} from "@/lib/os-fluxo";

/** Dias parado numa mesma etapa antes de sinalizar atenção / situação crítica. */
const LIMITE_ATENCAO = 5;
const LIMITE_CRITICO = 10;

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
});

function KanbanPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { isGestor, isDiretor, isFinanceiro, isDev } = useUserRole();
  const podeMover = isGestor || isDiretor || isFinanceiro || isDev;
  
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

  const COLUNA_FASE: Record<string, Fase> = {
    aberta: "criacao",
    vistoria: "laudo",
    orcamento_pendente: "orcamento",
    usinagem: "execucao",
    montagem: "execucao",
    pronto: "pronto",
  };

  const handleUpdateStatus = async (card: any, novaColuna: string) => {
    if (!podeMover) {
      toast.error("Sem permissão", {
        description: "Apenas Gestor, Diretor ou Administrativo/Financeiro podem mover a OS.",
      });
      return;
    }
    try {
      const faseAtual = faseDoStatus(card.status, (card as any).status_financeiro);
      const faseDestino = COLUNA_FASE[novaColuna] ?? "criacao";

      if (indiceFase(faseDestino) > indiceFase(faseAtual)) {
        const [checklistRes, custosRes, pecasRes] = await Promise.all([
          supabase.from("os_checklist_tecnico" as any).select("*").eq("os_id", card.id),
          supabase.from("os_custos" as any).select("*").eq("os_id", card.id),
          supabase.from("os_pecas_rastreio" as any).select("*").eq("os_id", card.id),
        ]);
        const resultado = avaliarFluxo(card, {
          checklist: (checklistRes.data as any[]) ?? [],
          custos: (custosRes.data as any[]) ?? [],
          pecas: (pecasRes.data as any[]) ?? [],
        });
        const { ok, pendencias } = podeAvancar(faseAtual, faseDestino, resultado);
        if (!ok) {
          toast.error(`Não é possível avançar para ${ROTULO_FASE[faseDestino]}`, {
            description: pendencias.slice(0, 4).join(" · "),
          });
          return;
        }
      }

      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: novaColuna })
        .eq('id', card.id);

      if (error) throw error;

      await supabase.from("historico_status_os" as any).insert({
        os_id: card.id,
        status_anterior: card.status ?? null,
        status_novo: novaColuna,
        observacao: `Fase alterada de ${ROTULO_FASE[faseAtual]} para ${ROTULO_FASE[faseDestino]} no Kanban`,
        executor_email: await getExecutorEmail(),
      });

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

  const cardsDaColuna = (colId: string) =>
    filteredCards.filter(
      (c: any) => colunaDoStatus(c.status, (c as any).status_financeiro) === colId,
    );


  return (
    <div className="h-[calc(100vh-160px)] flex flex-col space-y-6 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" asChild>
            <Link to="/dashboard" title="Voltar ao Dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
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
                  {cardsDaColuna(col.id).length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 bg-slate-50/50 border border-border/50 rounded-2xl p-3 space-y-3 overflow-y-auto custom-scrollbar shadow-inner">
              {cardsDaColuna(col.id).map((card: any) => {
                const referencia = card.updated_at || card.data_abertura || card.criado_em;
                const paradoDias = referencia
                  ? Math.floor((Date.now() - new Date(referencia).getTime()) / 86400000)
                  : 0;
                const alerta = paradoDias >= LIMITE_CRITICO ? "critico" : paradoDias >= LIMITE_ATENCAO ? "atencao" : "ok";
                return (
                <Link key={card.id} to="/os/$id" params={{ id: card.id }}>
                  <Card className={`shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group bg-white ${
                    alerta === "critico" ? "border-red-400 border-l-4" :
                    alerta === "atencao" ? "border-amber-400 border-l-4" : "border-border"
                  }`}>
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
                                    handleUpdateStatus(card, col.id);
                                  }}
                                >
                                  {col.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Badge className={`text-[8px] font-black uppercase tracking-widest ${
                            ['Alta','Urgente'].includes(card.prioridade) ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 border-none'
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
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          alerta === "critico" ? "bg-red-100 text-red-700" :
                          alerta === "atencao" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          Parado há {paradoDias}d
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
              
              {cardsDaColuna(col.id).length === 0 && (
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
