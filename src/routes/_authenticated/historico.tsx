import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");

  const { data: orders } = useSuspenseQuery({
    queryKey: ['historico_os_global', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('ordens_servico')
        .select('*')
        .order('criado_em', { ascending: false });

      if (statusFilter !== "todas") {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`numero_os.ilike.%${searchTerm}%,cliente.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pronto': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Finalizada</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      case 'orcamento_pendente': return <Badge variant="outline" className="border-amber-500 text-amber-600">Em Orçamento</Badge>;
      default: return <Badge variant="secondary" className="uppercase">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 industrial-theme pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Histórico e Busca Global</h1>
          </div>
        </div>
      </header>

      <main className="container-industrial mt-6 space-y-6">
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filtros de Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Termo de Busca</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="OS, Cliente ou Laudo..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status da OS</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos os Status</SelectItem>
                    <SelectItem value="aberta">Aberta / Triagem</SelectItem>
                    <SelectItem value="em_andamento">Em Produção</SelectItem>
                    <SelectItem value="orcamento_pendente">Aguardando Orçamento</SelectItem>
                    <SelectItem value="pronto">Finalizadas / Pronto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue placeholder="Últimos 30 dias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="todas">Todo o histórico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
            <span>Resultados Encontrados ({orders?.length || 0})</span>
            <span className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Dados Confidenciais
            </span>
          </div>

          <div className="grid gap-3">
            {orders?.map(os => (
              <Card 
                key={os.id} 
                className="group hover:border-primary transition-all cursor-pointer bg-white"
                onClick={() => router.navigate({ to: "/dashboard" })}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-slate-900">{os.numero_os}</span>
                          {getStatusBadge(os.status)}
                        </div>
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{os.cliente}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {os.criado_em ? new Date(os.criado_em).toLocaleDateString() : '—'}
                      </div>
                      <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                        R$ {Number(os.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {orders?.length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed text-slate-400">
                Nenhum registro encontrado com os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}